<template>
	<!--
	  IP 形象动效组件
	  ------------------------------------------------------------------
	  用途：把一张静态的 IP 全身图（或头像图）做出「活着的」感觉。
	  由于静态图无法产生真实肢体动作，这里实现的是业界通用的
	  「整图变换」微动效，叠加使用即可获得很强的生命力：

	    1. 持续呼吸：整图轻微上下浮动 + 极缓的缩放，模拟呼吸节奏
	    2. 待机摇摆：左右极小幅摆动（像站着轻微晃动）
	    3. 点击反馈：按下缩小、松开回弹（带轻微挤压感）
	    4. 进场动画：首次出现时从下方淡入 + 放大

	  所有动效都只做 transform / opacity，不触发布局重排，低端机也不卡。

	  后续想升级成「分图层局部动作」（眨眼、挥手）时，只需把插槽
	  <slot> 里的图片换成多图层结构，外部动效保持不变即可。

	  用法：
	    <ip-mascot src="/static/ip/full-body.png" :size="200" />
	    <ip-mascot :size="120" :float="false" :wave="false" />
	------------------------------------------------------------------
	-->
	<view
		class="ip-mascot"
		:class="{
			'is-float': float && !paused && !gravity,
			'is-sway': sway && !paused && !gravity,
			'is-enter': entered,
			'is-pressed': pressed,
			'is-field': gravity
		}"
		:style="gravity ? fieldStyle : rootStyle"
		@click="onTap"
		@touchstart="onTouchStart"
		@touchend="onTouchEnd"
		@touchcancel="onTouchEnd"
	>
		<!-- 底部柔和光晕（让 IP 有「站」在光上的感觉，可关闭） -->
		<view class="ip-shadow" v-if="shadow && !gravity"></view>

		<!-- IP 图：默认渲染传入的 src；也可用插槽完全自定义内部结构 -->
		<view class="ip-bounce-wrap" :class="{ 'is-bounce': bouncing }">
			<view class="ip-body">
				<!-- 重力层：gravity=true 时是"球"——按物理模拟的 x/y 位移 + 滚动旋转 -->
				<view class="ip-gravity" :style="gravity ? ballStyle : ''">
					<slot>
						<image class="ip-img" :src="src" mode="aspectFit" />
					</slot>
				</view>
			</view>
		</view>

		<!-- 点击时冒出的小气泡（交互反馈，可关闭） -->
		<view class="ip-bubble" v-if="bubbling">{{ bubbleText }}</view>
	</view>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, getCurrentInstance } from 'vue'
import { rpx2px } from '@/utils/device-adapt.js'

const props = defineProps({
	/** IP 图片路径（全身图优先使用透明底 PNG） */
	src: { type: String, default: '/static/logo.png' },
	/** 显示尺寸（rpx），会同时作用于宽高 */
	size: { type: [Number, String], default: 180 },
	/** 是否需要方形区域（true 用 size x size；false 时高度自适应图片） */
	square: { type: Boolean, default: true },
	/** 持续呼吸浮动 */
	float: { type: Boolean, default: true },
	/** 待机摇摆 */
	sway: { type: Boolean, default: true },
	/** 底部光晕 */
	shadow: { type: Boolean, default: true },
	/** 点击气泡文案，空字符串则不显示气泡 */
	bubbleText: { type: String, default: '' },
	/** 整体暂停动效（例如页面不可见时省电） */
	paused: { type: Boolean, default: false },
	/** 是否可点击（配合 @tap 事件使用） */
	tappable: { type: Boolean, default: true },
	/**
	 * 重力球模式：吉祥物变成一颗有重力的小球，在场地（组件自身占的那块区域）里自由滚动。
	 * 手机向右倾 → 球加速滚向右边，撞边弹回；放平后滚动衰减直到停住。
	 * 场地 = 外层传入的容器大小（球活动范围是场地减去球自身直径）。
	 */
	gravity: { type: Boolean, default: false },
	/** 重力强度系数（1 = 默认；调大滚得更快更猛） */
	gravityScale: { type: Number, default: 1 }
})

const emit = defineEmits(['tap'])

// ===== 重力球物理 =====
// 状态：pos(x,y)（球心相对场地左上角，px）、vel(vx,vy)（px/s）。
// 输入：含重力加速度 accelerationIncludingGravity 的 x/y（m/s²，水平放平时 x≈0 y≈-9.8）。
// 每帧：vel += g·dt → pos += vel·dt → 撞场地边缘按恢复系数反弹 → 滚动摩擦衰减。
// 姿态：球身按滚动方向自然旋转（rotate 随 x 位移累积），像真的球在滚而不是平移。

const PX_PER_RPX = 0.5   // 375px 设计宽下的基准换算（1rpx = 0.5px）：物理参数都以它为基准调的手感
// 手感标定（按 365px 宽场地反推）：满倾斜约 6~7 m/s² 时终端速度 ≈ 500px/s，穿过场地约 0.7s，
// 轻微倾斜 3 m/s² 时 ≈ 240px/s，约 1.5s —— 既跟手又不失控。嫌快/慢只调这两个数。
const G_GAIN = 120       // 倾斜 → 加速度的增益（px/s² 每 m/s²）
const BOUNCE = 0.5       // 撞墙恢复系数：撞后保留 50% 速度
const FRICTION = 0.22    // 滚动摩擦（越大停得越快；越小滑得越远）
const STOP_V = 8         // 速度低于这个值(px/s)且倾斜很小时直接刹停，避免永远滑个不停
// 上下通道单独放大：竖屏手持时左右倾是 9.8·sinθ（一阶，很灵敏），
// 前后倾只让 y 从 9.8 变成 9.8·cosθ（二阶小量，天生弱 3~4 倍），所以这里补增益。
const VERT_GAIN = 3

/**
 * 当前屏幕相对 375px 基准的 rpx 缩放（手机 = 1，平板/折叠屏展开 > 1）。
 * 球径用 rpx2px 真算（大屏上 1rpx 不止 0.5px，用固定 0.5 会让碰撞半径偏小、球压出场边），
 * 物理参数（加速度、刹停阈值）跟着同一个系数放大，跨尺寸手感一致。
 */
let unitK = 1

// 位置/旋转用普通变量（不是 ref）：每帧只写一次 ballStyle 字符串，避免多 ref + computed 连锁更新。
// 原因：App 端每次响应式写入都要过「逻辑层 → 渲染层」的桥，60fps 全量写会明显掉帧。
let px = 0
let py = 0
let rot = 0
const fieldW = ref(0)
const fieldH = ref(0)
const ballR = ref(0)

let rafId = null
let accelActive = false
let h5Handler = null
let accelerometerHandler = null   // App 端传感器回调：存引用才能在卸载时真正解绑
let sensorWatchdog = null         // 无数据看门狗：3s 没事件只提示一句，不报错
let gotSensorData = false         // 是否真的收到过传感器数据
let lastT = 0
let vx = 0
let vy = 0
let ax = 0
let ay = 0
let phase = 0            // 滚动相位（由 x 位移积分而来），用来求 rotate 角度
let inited = false
let lastWrite = 0        // 上次写样式的时刻（节流用，App 端约 30fps）
let ballEl = null        // H5：球层 DOM 引用，直接写 style，绕开 Vue 更新

// ===== 运行环境兼容 =====
// App 的逻辑层（JSCore）里没有 window / document / performance / requestAnimationFrame，
// 直接用会抛 "performance is not defined" 之类的错，回调一挂整个物理循环就停摆。
// 这里统一做特性检测兜底：H5 用原生 rAF，App 退化成 setTimeout(16ms ≈ 60fps)。
function nowMs() {
	return (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now()
}

function raf(fn) {
	if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn)
	return setTimeout(() => fn(nowMs()), 16)
}

function craf(id) {
	if (typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(id); return }
	clearTimeout(id)
}

const ballStyle = ref('')   // 直接存 transform 字符串（App 端由 writeStyle 节流写入）

// 写样式：H5 直接改 DOM（零 Vue 更新，最省）；App 端节流到 ~30fps 且只写这一个字符串 ref。
// 这是"掉帧严重"的解法：60fps × 多个响应式写 → 桥拥堵，减半频率 + 减到单节点后明显顺滑。
function writeStyle(t) {
	if (t - lastWrite < 33) return
	lastWrite = t
	const v = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`
	if (ballEl) { ballEl.style.transform = v; return }
	ballStyle.value = `transform: ${v};`
}

/** 场地尺寸样式：gravity 模式下组件铺满外层给的位置。
    用绝对定位而不是 height:100%：外层高度来自 flex-grow 时，百分比高度在部分端
    解析不出来（实测算出来是 0，球被压成一条线）。
    约定：gravity 模式的外层容器需要 position: relative（登录页的 .au-mascot 已满足）。 */
const fieldStyle = computed(() => {
	const s = typeof props.size === 'number' ? props.size + 'rpx' : props.size
	return `position: absolute; left: 0; top: 0; right: 0; bottom: 0; --ip-size: ${s};`
})

function setField() {
	// 场地尺寸：优先用 uni 的节点查询（H5 / App 都支持）。
	// App 逻辑层没有 DOM，不能用 $el.getBoundingClientRect()，只能走 createSelectorQuery。
	const inst = getCurrentInstance()
	const proxy = inst && inst.proxy
	const apply = (rect) => {
		if (!rect || !rect.width || !rect.height) return false
		fieldW.value = rect.width
		fieldH.value = rect.height
		const s = typeof props.size === 'number' ? props.size : parseFloat(props.size) || 180
		// 球半径按当前屏幕的真实 rpx 换算（与 CSS 里 --ip-size 的 rpx 同一套基准）
		const unit = rpx2px(1) || PX_PER_RPX
		ballR.value = rpx2px(s) / 2
		unitK = unit / PX_PER_RPX
		if (!inited) {
			// 初始落在场地中上位置
			px = fieldW.value / 2 - ballR.value
			py = Math.max(0, fieldH.value * 0.18)
			inited = true
			lastWrite = 0
			writeStyle(nowMs())   // 初始位置先落到元素上
		}
		return true
	}
	// H5 兜底：直接读 DOM
	const applyDom = () => {
		const el = proxy && proxy.$el
		if (!el || typeof el.getBoundingClientRect !== 'function') return false
		// H5：缓存球层 DOM，之后每帧直接改 style，绕开 Vue 更新
		if (el.querySelector) ballEl = el.querySelector('.ip-gravity')
		return apply(el.getBoundingClientRect())
	}
	try {
		if (uni.createSelectorQuery && proxy) {
			uni.createSelectorQuery().in(proxy).select('.ip-mascot').boundingClientRect((rect) => {
				// 查询拿不到尺寸（部分端不支持 .in / 节点还没渲染）：立刻退回 DOM 方案
				if (!apply(Array.isArray(rect) ? rect[0] : rect)) applyDom()
			}).exec()
			return true
		}
	} catch (err) { /* 查询不可用：退回 DOM 方案 */ }
	return applyDom()
}

function step(t) {
	rafId = null
	// 兜底：场地还没量到（挂载时机晚于首次事件）就先量，量不到这帧跳过
	if (!fieldW.value) {
		setField()
		if (!fieldW.value) { kickLoop(); return }
	}
	const dt = Math.min((t - lastT) / 1000, 0.033) || 0.016
	lastT = t

	// 1) 重力输入 → 加速度（场地坐标系：x 向右为正，y 向下为正）
	vx += ax * G_GAIN * unitK * dt
	vy += ay * G_GAIN * unitK * dt

	// 2) 滚动摩擦（速度指数衰减；倾斜时摩擦小一点，感觉"顺势"）
	const damp = Math.pow(1 - FRICTION, dt * 6)
	vx *= damp
	vy *= damp

	// 3) 积分位置
	const dx = vx * dt
	const dy = vy * dt
	px += dx
	py += dy
	phase += dx
	// 滚动角 = 位移弧长 / 半径（度）——球滚多远转多少，物理直觉
	rot = (phase / Math.max(ballR.value, 1)) * 57.29578

	// 4) 场地边界反弹
	const maxX = fieldW.value - ballR.value * 2
	const maxY = fieldH.value - ballR.value * 2
	if (px < 0) { px = 0; vx = Math.abs(vx) * BOUNCE }
	else if (px > maxX) { px = maxX; vx = -Math.abs(vx) * BOUNCE }
	if (py < 0) { py = 0; vy = Math.abs(vy) * BOUNCE }
	else if (py > maxY) { py = maxY; vy = -Math.abs(vy) * BOUNCE }

	// 5) 低速刹停（避免在平放时永远微滑）
	if (Math.abs(vx) < STOP_V * unitK && Math.abs(vy) < STOP_V * unitK && Math.abs(ax) < 0.25 && Math.abs(ay) < 0.25) {
		vx = 0
		vy = 0
		lastWrite = 0
		writeStyle(t)   // 停之前补一帧，保证最终位置落到元素上（节流可能吃掉最后一帧）
		rafId = null
		return
	}
	writeStyle(t)
	rafId = raf(step)
}

function kickLoop(t) {
	if (rafId != null) return
	lastT = t || nowMs()
	rafId = raf(step)
}

function onMotion(rawX, rawY) {
	gotSensorData = true
	// 首次进入先校准：只采样不驱动（这段时间物理循环不启动，球停在初始位置）。
	// 目的：不同手机的传感器零点有偏移（放平时 ax 可能读到 0.3~0.8），不校准球会自己慢慢漂走。
	if (!calibrated) {
		if (!calibEnd) calibEnd = Date.now() + CALIB_MS
		calibSumX += rawX
		calibSumY += rawY
		calibN++
		if (Date.now() >= calibEnd && calibN >= 3) {
			baseX = calibSumX / calibN
			baseY = calibSumY / calibN
			calibrated = true
			console.log('[gravity] baseline 校准完成', baseX.toFixed(2), baseY.toFixed(2), 'samples=' + calibN)
		}
		return
	}
	// 数据平滑：一阶低通滤波（0.35 越小越稳、越"重"；传感器约 7~50Hz，太小会明显发钝）
	// 实际输入 = 当前值 - baseline：手机保持进入时的姿势就静止，倾斜才滚。
	const cx = Math.max(-12, Math.min(12, rawX - baseX))
	const cy = Math.max(-12, Math.min(12, (rawY - baseY) * VERT_GAIN))
	ax += (cx - ax) * 0.35
	ay += (cy - ay) * 0.35
	kickLoop()
}

// ===== 首次进入自动校准（采样窗口与状态）=====
const CALIB_MS = 500
let calibEnd = 0
let calibSumX = 0
let calibSumY = 0
let calibN = 0
let baseX = 0
let baseY = 0
let calibrated = false

// ===== 传感器单位自适应（g / m/s²）=====
// uni 文档口径是 g（静止竖屏 |y|≈1），个别机型或基础库直接给 m/s²（|y|≈9.8）。
// 用首批样本的量级判定一次并记住，避免 9.8 × 9.8 把重力放大成"一碰就飙到边界"。
let unitScale = 0   // 0=未判定；9.8=按 g 换算；1=本来就是 m/s²
function accelScale(res) {
	if (unitScale) return unitScale
	const mag = Math.max(Math.abs(res.x || 0), Math.abs(res.y || 0), Math.abs(res.z || 0))
	if (mag > 2) {
		unitScale = 1
		console.log('[gravity] accelerometer unit = m/s²（不再乘 9.8）')
	} else if (mag > 0.05) {
		unitScale = 9.8
		console.log('[gravity] accelerometer unit = g（× 9.8）')
	}
	return unitScale   // 全 0（无传感器 / 被禁用）时保持 0，调用方忽略这一帧
}

// ===== 无数据看门狗 =====
// 3 秒内一个传感器事件都没收到（非 https / 无传感器 / 被系统禁用）：只提示一句，
// 不报错、不改状态 —— 球停在初始位置，UI 照常显示。
function armSensorWatchdog() {
	clearSensorWatchdog()
	sensorWatchdog = setTimeout(() => {
		sensorWatchdog = null
		if (!gotSensorData) console.log('[gravity] 3s 内没有传感器数据：球保持静止（检查 https / 传感器权限 / 设备是否支持）')
	}, 3000)
}

function clearSensorWatchdog() {
	if (sensorWatchdog) { clearTimeout(sensorWatchdog); sensorWatchdog = null }
}

// #ifdef H5
function startGravity() {
	if (accelActive || !props.gravity) return
	accelActive = true
	gotSensorData = false
	setField()
	// 无数据保护：环境根本没有运动传感器 API（或浏览器禁用）→ 静默返回，
	// 不报错、不改状态，球停在初始位置，UI 照常显示。
	const hasMotion = typeof window !== 'undefined' && ('DeviceMotionEvent' in window || 'ondevicemotion' in window)
	const hasOrient = typeof window !== 'undefined' && ('DeviceOrientationEvent' in window || 'ondeviceorientation' in window)
	if (!hasMotion && !hasOrient) {
		console.log('[gravity] 当前环境没有运动传感器 API，球保持静止')
		return
	}
	// 真实传感器绑定：devicemotion 优先（含重力的 aIG.x/y），deviceorientation 兜底
	// （部分安卓 WebView 只发 orientation 不发 motion）。
	// ⚠ 方向口径（真机实测定死，别再"推演"改回来）：
	//   手机向右倾 → accelerationIncludingGravity.x 是【负值】→ 取负号才是"向右滚"；
	//   竖屏手持 y 取负，让球沉向场地底部。
	h5Handler = (e) => {
		if (e.accelerationIncludingGravity || e.acceleration) {
			const g = e.accelerationIncludingGravity || e.acceleration
			onMotion(-(g.x || 0), -(g.y || 0))
		} else if (e.gamma != null) {
			// deviceorientation 事件：gamma=左右倾角、beta=前后倾角（度）→ 换算成等效加速度
			const k = Math.PI / 180
			onMotion(Math.sin(e.gamma * k) * 9.8, Math.sin(e.beta * k) * 9.8)
		}
	}
	window.addEventListener('devicemotion', h5Handler, false)
	window.addEventListener('deviceorientation', h5Handler, false)
	armSensorWatchdog()
	// 尺寸可能晚于挂载（图片/字体），下一帧再量一次
	setTimeout(setField, 120)
}

function stopGravity() {
	if (!accelActive) return
	accelActive = false
	if (h5Handler) {
		window.removeEventListener('devicemotion', h5Handler, false)
		window.removeEventListener('deviceorientation', h5Handler, false)
		h5Handler = null
	}
	clearSensorWatchdog()
	if (rafId != null) { craf(rafId); rafId = null }
}
// #endif

// #ifndef H5
function startGravity() {
	if (accelActive || !props.gravity) return
	accelActive = true
	gotSensorData = false
	setField()
	// 保存回调引用：卸载时才能用同一个引用解绑（传匿名函数给 off 是解绑不掉的，传感器会一直监听）
	accelerometerHandler = (res) => {
		const k = accelScale(res)
		if (!k) return   // 全 0：无传感器 / 被系统禁用 → 忽略这一帧，球保持初始位置
		// ⚠ 方向口径（真机实测定死）：向右倾 → res.x 为【负】→ 取负号让球向右滚；
		// y 取负让球沉向场地底部。
		onMotion(-(res.x || 0) * k, -(res.y || 0) * k)
	}
	uni.onAccelerometerChange(accelerometerHandler)
	try {
		uni.startAccelerometer({
			interval: 'game',
			success: () => console.log('[gravity] accelerometer started'),
			fail: (err) => console.log('[gravity] accelerometer start failed', err)
		})
	} catch (err) {
		// 没有传感器 / 权限被拒：不报错，球停在初始位置，UI 照常显示
		console.log('[gravity] accelerometer start failed', err)
	}
	armSensorWatchdog()
}

function stopGravity() {
	if (!accelActive) return
	accelActive = false
	try {
		if (accelerometerHandler && uni.offAccelerometerChange) uni.offAccelerometerChange(accelerometerHandler)
	} catch (err) { /* 旧基础库没有 off：退化为 stopAccelerometer */ }
	accelerometerHandler = null
	try { uni.stopAccelerometer() } catch (err) { /* 同上 */ }
	clearSensorWatchdog()
	if (rafId != null) { craf(rafId); rafId = null }
}
// #endif

if (props.gravity) startGravity()

// 场地尺寸自适应：挂载后量一次（script setup 阶段 $el 还不存在），窗口变化时重量
onMounted(() => {
	if (!props.gravity) return
	if (!setField()) {
		// 图片/字体晚到导致首帧量出 0：稍等再试
		setTimeout(setField, 200)
	}
})
if (props.gravity && typeof window !== 'undefined') {
	window.addEventListener('resize', setField, { passive: true })
}

const entered = ref(false)
const pressed = ref(false)
const bubbling = ref(false)
const bouncing = ref(false)

let enterTimer = null
let bubbleTimer = null
let bounceTimer = null

// 进场动画：挂载后下一帧触发，让首帧状态生效
enterTimer = setTimeout(() => {
	entered.value = true
}, 30)

onUnmounted(() => {
	if (enterTimer) clearTimeout(enterTimer)
	if (bubbleTimer) clearTimeout(bubbleTimer)
	if (bounceTimer) clearTimeout(bounceTimer)
	stopGravity()
	if (props.gravity && typeof window !== 'undefined') {
		window.removeEventListener('resize', setField)
	}
})

/** 尺寸样式（computed 避免每次渲染重复计算） */
const rootStyle = computed(() => {
	const s = typeof props.size === 'number' ? props.size + 'rpx' : props.size
	return props.square ? { width: s, height: s } : { width: s }
})

function onTouchStart() {
	if (!props.tappable) return
	pressed.value = true
}

function onTouchEnd() {
	if (!props.tappable) return
	pressed.value = false
}

function onTap() {
	if (!props.tappable) return
	// 点击反馈一：气泡短暂出现
	if (props.bubbleText) {
		bubbling.value = true
		if (bubbleTimer) clearTimeout(bubbleTimer)
		bubbleTimer = setTimeout(() => {
			bubbling.value = false
		}, 1400)
	}
	// 点击反馈二：弹跳一下
	// 先归零、下一帧再置位，确保连续点击时动画能重新播放
	bouncing.value = false
	if (bounceTimer) clearTimeout(bounceTimer)
	bounceTimer = setTimeout(() => {
		bouncing.value = true
		// 动画时长 460ms，结束后复位以便下次点击
		bounceTimer = setTimeout(() => {
			bouncing.value = false
		}, 460)
	}, 16)

	emit('tap')
}
</script>

<style scoped>
	/* 外层：只负责尺寸与定位 */
	.ip-mascot {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		/* 进场初始态：透明 + 偏下 + 缩小 */
		opacity: 0;
		transform: translateY(24rpx) scale(0.92);
		transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* 进场结束态 */
	.ip-mascot.is-enter {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	/* ===== 底部光晕 ===== */
	.ip-shadow {
		position: absolute;
		left: 50%;
		bottom: 6%;
		width: 62%;
		height: 10%;
		transform: translateX(-50%);
		background: radial-gradient(ellipse at center,
			var(--brand-glow-soft, rgba(58, 131, 247, 0.18)) 0%, transparent 70%);
		border-radius: 50%;
		animation: ip-shadow-breathe 3.6s ease-in-out infinite;
	}

	@keyframes ip-shadow-breathe {
		0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.9; }
		50%      { transform: translateX(-50%) scaleX(0.88); opacity: 0.65; }
	}

	/* ===== IP 本体（三层分工，避免 transform 互相覆盖） =====
	   .ip-bounce-wrap → 点击弹跳
	   .ip-body        → 呼吸浮动
	   .ip-img         → 待机摇摆
	*/
	.ip-bounce-wrap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ip-body {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
	}

	.ip-img {
		width: 100%;
		height: 100%;
	}

	/* ===== 重力层 =====
	   gravity=false：静态跟随（无 style 时不写 transform）
	   gravity=true ：球模式——ip-mascot 变成场地（is-field），球在场地里自由滚动，
	                  位移与旋转由 JS 物理循环逐帧写入 ballStyle。 */
	.ip-gravity {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
	}

	/* 场地模式：占满外层、球图按 size 缩放、溢出裁掉（球滚到边不能穿帮） */
	.ip-mascot.is-field {
		position: relative;
		overflow: hidden;
	}

	.ip-mascot.is-field .ip-gravity {
		position: absolute;
		left: 0;
		top: 0;
		width: auto;
		height: auto;
	}

	.ip-mascot.is-field .ip-bounce-wrap,
	.ip-mascot.is-field .ip-body {
		width: auto;
		height: auto;
		display: contents;
	}

	/* 球本体：--ip-size 是球的直径（rpx），JS 侧用同一个值算半径做碰撞 */
	.ip-mascot.is-field .ip-img {
		width: var(--ip-size, 150rpx);
		height: var(--ip-size, 150rpx);
		border-radius: 50%;
	}

	/* ===== 动效 1：呼吸浮动 =====
	   整图上下浮动 + 极缓缩放，节奏接近真实呼吸（3.6s 一次） */
	.ip-mascot.is-float .ip-body {
		animation: ip-float 3.6s ease-in-out infinite;
	}

	@keyframes ip-float {
		0%, 100% { transform: translateY(0) scale(1); }
		50%      { transform: translateY(-14rpx) scale(1.025); }
	}

	/* ===== 动效 2：待机摇摆 =====
	   用极小的旋转制造「站着轻轻晃」的感觉，轴心放在脚底附近 */
	.ip-mascot.is-sway .ip-img {
		animation: ip-sway 5.2s ease-in-out infinite;
		transform-origin: 50% 92%;
	}

	@keyframes ip-sway {
		0%, 100% { transform: rotate(-1.1deg); }
		50%      { transform: rotate(1.1deg); }
	}

	/* ===== 动效 3：点击反馈 =====
	   按下缩小（挤压感），松开由 transition 回弹 */
	.ip-mascot.is-pressed .ip-bounce-wrap {
		transform: scale(0.94);
		transition: transform 0.12s ease;
	}

	/* 点击瞬间的弹跳（JS 控制 460ms 后移除类） */
	.ip-bounce-wrap.is-bounce {
		animation: ip-bounce 0.46s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes ip-bounce {
		0%   { transform: scale(1); }
		35%  { transform: scale(0.92) translateY(6rpx); }
		70%  { transform: scale(1.06) translateY(-6rpx); }
		100% { transform: scale(1) translateY(0); }
	}

	/* ===== 点击气泡 ===== */
	.ip-bubble {
		position: absolute;
		top: -6rpx;
		right: -12rpx;
		max-width: 240rpx;
		padding: 12rpx 20rpx;
		background: var(--bubble-bg, rgba(255, 255, 255, 0.94));
		border: 1rpx solid var(--border-soft, rgba(23, 33, 58, 0.1));
		border-radius: 20rpx 20rpx 20rpx 6rpx;
		box-shadow: 0 8rpx 24rpx rgba(31, 45, 61, 0.14);
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text, #333);
		line-height: 1.4;
		white-space: nowrap;
		animation: ip-bubble-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		z-index: 2;
	}

	@keyframes ip-bubble-in {
		from { opacity: 0; transform: translateY(10rpx) scale(0.85); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	/* 无障碍：系统开启「减弱动态效果」时关掉所有动画 */
	@media (prefers-reduced-motion: reduce) {
		.ip-mascot,
		.ip-mascot .ip-body,
		.ip-mascot .ip-img,
		.ip-mascot .ip-gravity,
		.ip-shadow {
			animation: none !important;
			transition: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
