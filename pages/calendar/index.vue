<template>
	<view class="page page-tabbar" :class="{ 'theme-thought': isThoughtMode }">

		<!-- ① 页面标题（Hero） -->
		<view class="hero">
			<!-- IP 形象：呼吸浮动 + 待机摇摆 + 点击弹跳，点一下还会说句话 -->
			<ip-mascot
				class="hero-mascot"
				src="/static/logo.png"
				:size="112"
				shadow
				:bubble-text="mascotBubble"
				@tap="onMascotTap"
			/>
			<view class="hero-text">
				<text class="hero-title">jack会员分享</text>
			</view>
			<!-- 右上角「关于我」入口（sheen：黑金主题下带周期扫光） -->
			<view class="hero-about sheen" @click="openAbout">
				<uni-icons type="person" size="15" color="var(--brand)" />
				<text class="hero-about-text">关于我</text>
			</view>
		</view>

		<!-- ② 模式切换（毛玻璃胶囊分段） -->
		<view class="mode-switch glassmorphism">
			<view class="vibrancy-effect"></view>
			<view
				class="mode-item"
				:class="{ active: mode === CONTENT_MODE.IMAGE }"
				@click="switchMode(CONTENT_MODE.IMAGE)"
			>
				<uni-icons
					:type="mode === CONTENT_MODE.IMAGE ? 'images-filled' : 'images'"
					size="16"
					:color="mode === CONTENT_MODE.IMAGE ? 'var(--on-brand)' : 'var(--text-aux)'"
				/>
				<text class="mode-text">专属会员分享</text>
			</view>
			<view
				class="mode-item"
				:class="{ active: mode === CONTENT_MODE.THOUGHT }"
				@click="switchMode(CONTENT_MODE.THOUGHT)"
			>
				<uni-icons
					:type="mode === CONTENT_MODE.THOUGHT ? 'star-filled' : 'star'"
					size="16"
					:color="mode === CONTENT_MODE.THOUGHT ? 'var(--on-brand)' : 'var(--text-aux)'"
				/>
				<text class="mode-text">365天思考实验</text>
			</view>
		</view>

		<!-- ③ 日历卡片 -->
		<view class="calendar-card glassmorphism">
			<uni-calendar
				class="calendar"
				:date="selectedDate"
				:selected="calendarMarks"
				:insert="true"
				:show-month="false"
				@change="onCalendarChange"
				@monthSwitch="onMonthSwitch"
			/>
		</view>

		<!-- ④ 当天内容 -->
		<view class="day-section">
			<view class="day-head">
				<view class="day-head-info">
					<text class="day-date">{{ selectedDateText }}</text>
					<view class="day-label-row">
						<view class="day-label-dot" :class="'day-label-dot--' + mode"></view>
						<text class="day-label">{{ dayLabelText }}</text>
					</view>
				</view>
				<view class="tag tag-primary" v-if="!loading && !loadError && shares.length">
					{{ shares.length }} 张图
				</view>
			</view>

			<!-- 加载中：骨架复用真卡片的类与尺寸，替换后视觉不跳（日历保持不动） -->
			<template v-if="loading">
				<view class="share-card glassmorphism" v-for="i in 2" :key="'share-sk-' + i">
					<skeleton-block h="400rpx" r="0" />
					<view class="sk-cap">
						<skeleton-block w="62%" h="26rpx" />
					</view>
					<view class="share-foot">
						<skeleton-block w="150rpx" h="32rpx" r="999rpx" />
						<skeleton-block w="60rpx" h="22rpx" />
					</view>
				</view>
			</template>

			<!-- 请求失败 -->
			<view class="state-card glassmorphism" v-else-if="loadError">
				<uni-icons type="info" size="30" color="var(--danger)" />
				<text class="state-text">内容加载失败，请稍后重试</text>
				<button class="btn btn-plain btn-sm retry-btn" @click="retryLoad">重新加载</button>
			</view>

			<!-- 空状态 -->
			<view class="state-card glassmorphism" v-else-if="!shares.length">
				<uni-icons :type="emptyIcon" size="30" color="var(--text-aux)" />
				<text class="state-text">{{ emptyText }}</text>
			</view>

			<!-- 内容卡片列表（只展示当前模式的内容） -->
			<template v-else>
				<view
					class="share-card glassmorphism"
					v-for="share in shares"
					:key="share.id"
					@click="openDetail(share)"
				>
					<view class="share-img-wrap" v-if="share.image_url" @click.stop="previewShare(share)">
						<!-- lazy-load：一天多张时只解码滚到附近的那几张（原图 2048，整屏一起解码会明显拖住切换）；
							 预览层里不能加，那边是 swiper 切换瞬间就要图到位 -->
						<image class="share-img" :src="share.image_url" mode="aspectFill" lazy-load />
					</view>
					<text class="share-caption" v-if="share.caption">{{ share.caption }}</text>
					<view class="share-foot">
						<view class="tag tag-primary" v-if="share.source_name">{{ share.source_name }}</view>
						<text class="share-time" v-if="share.created_at">{{ share.created_at.slice(11, 16) }}</text>
						<view class="share-foot-space"></view>
						<uni-icons type="right" size="14" color="var(--text-weak)" />
					</view>
				</view>
			</template>

			<!-- 365天思考实验模式：当天想法记录 + 连续打卡（加载/失败态不显示） -->
			<thought-note-card
				v-if="isThoughtMode && !loading && !loadError"
				:date="selectedDate"
				ref="noteCardRef"
			/>
		</view>

		<!-- ⑤ 分享详情（当前页面内的底部 Sheet） -->
		<share-detail-sheet
			:visible="detailVisible"
			:share="selectedShare"
			@close="closeDetail"
			@preview="onDetailPreview"
		/>

		<!-- ⑤b 全屏图片预览：左右滑动跨天，顶部日期跟着当前图变 -->
		<image-viewer
			:visible="viewerVisible"
			:items="viewerItems"
			:index="viewerIndex"
			@close="viewerVisible = false"
		/>

		<!-- ⑥ 关于我（抖音二维码 Sheet） -->
		<about-me-sheet :visible="aboutVisible" @close="closeAbout" />

		<!-- 底部导航（悬浮毛玻璃胶囊） -->
		<app-tab-bar :current="0" />
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { getShareDates, getSharesByDate, getMonthShares, CONTENT_MODE } from '@/api/shares.js'
import { checkPendingAlarm } from '@/api/countdown.js'
import { getAppMode, setAppMode, syncStatusBarTheme, syncRootTheme, hideNativeTabBar } from '@/utils/app-mode.js'

const STORAGE_KEY = 'lastSelectedDate'

function pad(n) {
	return String(n).padStart(2, '0')
}

function todayStr() {
	const t = new Date()
	return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

function isValidDate(s) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s || '')
}

const today = todayStr()

// 初始化：优先恢复上次选中日期，否则定位到今天
const lastSelected = uni.getStorageSync(STORAGE_KEY)
const initialDate = isValidDate(lastSelected) ? lastSelected : today

// 初始化模式：App 冷启动已被重置为专属会员分享，这里读的是本次会话内的选择
// （主题跟着模式走：专属会员分享 = 蓝色，365天思考实验 = 黑色，见 App.vue 的 .theme-thought）
const mode = ref(getAppMode())
// H5：把主题类挂到 html 根节点（滚动条/overscroll 底色跟随主题）
syncRootTheme(mode.value)
const selectedDate = ref(initialDate)
const currentMonth = ref(initialDate.slice(0, 7))
// 两种模式各自的打点日期集合
const shareDates = ref({ image: [], thought: [] })
const shares = ref([])
const loading = ref(false)
const loadError = ref(false)
const detailVisible = ref(false)
const selectedShare = ref(null)
// 全屏预览：items 是当月的全部内容（跨天滑动），index 指向当前这张
const viewerVisible = ref(false)
const viewerItems = ref([])
const viewerIndex = ref(0)

/**
 * 日历打点数据。
 * 只展示「当前模式」有内容的日子——切换到思考实验后，日历上就只显示
 * 思考实验的打点，不会混入专属会员分享的日期。
 *
 * uni-calendar 的 selected 支持 [{ date, info }]，info 会渲染到日期下方的
 * 文字位上；这里用 info 的值作为类名（'i' / 't'）供组件画出对应颜色的圆点。
 */
const calendarMarks = computed(() => {
	const list = shareDates.value[mode.value] || []
	const flag = mode.value === CONTENT_MODE.THOUGHT ? 't' : 'i'
	return list.map((date) => ({ date, info: flag }))
})

const selectedDateText = computed(() => {
	if (!isValidDate(selectedDate.value)) return ''
	const [y, m, d] = selectedDate.value.split('-')
	return `${Number(y)}年${Number(m)}月${Number(d)}日`
})

const isToday = computed(() => selectedDate.value === today)

const isThoughtMode = computed(() => mode.value === CONTENT_MODE.THOUGHT)

/** 「今日分享 / 当日分享」随模式变化 */
const dayLabelText = computed(() => {
	const prefix = isToday.value ? '今日' : '当日'
	return isThoughtMode.value ? `${prefix}思考` : `${prefix}分享`
})

const emptyText = computed(() => {
	return isThoughtMode.value
		? '这一天还没有思考实验'
		: '这一天暂时还没有分享'
})

const emptyIcon = computed(() => (isThoughtMode.value ? 'star' : 'images'))

/** 请求某月份「当前模式」的打点日期集合（带序号守卫：慢返回的旧请求作废） */
let datesReqSeq = 0
async function loadShareDates(month) {
	if (!month) return
	const seq = ++datesReqSeq
	const m = mode.value
	try {
		const dates = await getShareDates(month, m)
		if (seq !== datesReqSeq) return
		// 只写入当前模式的位置，避免模式切换后串数据
		shareDates.value = { ...shareDates.value, [m]: dates }
	} catch (e) {
		if (seq !== datesReqSeq) return
		// 打点失败不阻塞主流程，静默降级为无标记
		shareDates.value = { ...shareDates.value, [m]: [] }
	}
}

/** 请求某一天当前模式的内容列表（带序号守卫：快速切日期时丢弃旧响应） */
let sharesReqSeq = 0
async function loadShares(date) {
	if (!isValidDate(date)) return
	const seq = ++sharesReqSeq
	loading.value = true
	loadError.value = false
	try {
		const list = await getSharesByDate(date, mode.value)
		if (seq !== sharesReqSeq) return
		shares.value = list
		uni.setStorageSync(STORAGE_KEY, date)
	} catch (e) {
		if (seq !== sharesReqSeq) return
		shares.value = []
		loadError.value = true
	} finally {
		if (seq === sharesReqSeq) loading.value = false
	}
}

/**
 * 切换模式：日期保持不变，日历打点与内容区全部换成该模式的数据。
 * 打点需要重新按新模式请求（不同模式有内容的日子不同）。
 */
function switchMode(next) {
	if (mode.value === next) return
	mode.value = next
	// 模式即主题：写入共享存储（干正事页 onShow 会读取跟随），状态栏同步翻转
	setAppMode(next)
	syncStatusBarTheme(next)
	syncRootTheme(next)
	detailVisible.value = false
	// 清空旧内容，避免切换瞬间还显示上一个模式的卡片
	shares.value = []
	// 打点与内容都按新模式重新拉取
	loadShareDates(currentMonth.value)
	loadShares(selectedDate.value)
}

/** 点击日期：重新请求该日期当前模式的内容；点到跨月灰格时同步打点月份 */
function onCalendarChange(e) {
	// 兼容不同端的事件包装：真机/H5 是 e.fulldate，部分平台是 e.detail.fulldate
	const detail = (e && e.detail) ? e.detail : (e || {})
	const date = detail.fulldate
	if (!isValidDate(date) || date === selectedDate.value) return
	selectedDate.value = date
	// uni-calendar 对 date 属性有 watch：选中跨月灰格会静默把视图切到该月，
	// 但不触发 monthSwitch，这里必须自己同步月份，否则新视图没有打点数据
	const month = date.slice(0, 7)
	if (month !== currentMonth.value) {
		currentMonth.value = month
		loadShareDates(month)
	}
	loadShares(date)
}

/** 切换月份：重新请求该月份的打点数据 */
function onMonthSwitch(e) {
	const detail = (e && e.detail) ? e.detail : (e || {})
	if (!detail.year || !detail.month) return
	const month = `${detail.year}-${pad(detail.month)}`
	if (month === currentMonth.value) return
	currentMonth.value = month
	loadShareDates(month)
}

function openDetail(share) {
	selectedShare.value = share
	detailVisible.value = true
}

/** 点卡片上的图：打开全屏预览（不经过详情弹层，H5 下弹层与预览层叠加会不上屏） */
async function openViewer(share) {
	if (!share || !share.image_url) return
	const month = (share.share_date || selectedDate.value).slice(0, 7)
	let list = []
	try {
		list = await getMonthShares(month, mode.value)
	} catch (e) {
		// 整月取不到就退回只看这一张，至少预览本身还能用
		list = [share]
	}
	if (!list.length) list = [share]
	viewerItems.value = list
	viewerIndex.value = Math.max(0, list.findIndex((r) => r.image_url === share.image_url))
	viewerVisible.value = true
}

function previewShare(share) {
	openViewer(share)
}

/** 详情弹层里点大图：先关弹层再开预览，两层叠加会互相干扰 */
function onDetailPreview(share) {
	closeDetail()
	openViewer(share)
}

function closeDetail() {
	detailVisible.value = false
}

const aboutVisible = ref(false)

/** 思考本子页返回后要重读那天的记录 */
const noteCardRef = ref(null)

function openAbout() {
	aboutVisible.value = true
}

function closeAbout() {
	aboutVisible.value = false
}

/* ==================== IP 形象交互 ==================== */

const MASCOT_LINES = [
	'今天也来啦～',
	'点我干嘛😆',
	'记得收藏喜欢的图',
	'喝口水休息下',
	'每天都来看看我',
	'嘿嘿，被发现了'
]

const mascotBubble = ref('')

/** 点击 IP：随机说一句，制造「它会回应你」的感觉 */
function onMascotTap() {
	const pool = MASCOT_LINES.filter((t) => t !== mascotBubble.value)
	const list = pool.length ? pool : MASCOT_LINES
	mascotBubble.value = list[Math.floor(Math.random() * list.length)]
}

function retryLoad() {
	loadShares(selectedDate.value)
}

loadShareDates(currentMonth.value)
loadShares(selectedDate.value)

// 闹钟到点会把 App 拉到前台（启动页是本页），跳到「干正事」页响铃
function gotoWorkIfAlarmDue() {
	const due = checkPendingAlarm()
	if (due) {
		uni.switchTab({ url: '/pages/work/index' })
		return true
	}
	return false
}

// 到点闹钟会把 App 拉到前台触发 onShow 立即检查，这里只是兜底轮询，5 秒一次足够，
// 避免常驻 1 秒读一次本地存储
let alarmChecker = null

onShow(() => {
	gotoWorkIfAlarmDue()
	hideNativeTabBar()
	// 状态栏文字颜色跟随当前主题（切页/回前台可能被系统重置，回前台补一次）
	syncStatusBarTheme(mode.value)
	// 从本子页写完结算回来，重读一遍那天的记录与连续天数
	if (noteCardRef.value) noteCardRef.value.refresh()
	// 兜底轮询只在可见时跑：tab 页现在切走不销毁，常驻会把隐藏的页面变成能抢跳转的后台
	if (!alarmChecker) alarmChecker = setInterval(gotoWorkIfAlarmDue, 5000)
})

onHide(() => {
	if (alarmChecker) {
		clearInterval(alarmChecker)
		alarmChecker = null
	}
})
</script>

<style scoped>
	/* ===== Hero（UI 文档第 6 节，非毛玻璃形态） ===== */
	.hero {
		background: var(--hero-bg);
		border: 1rpx solid var(--hero-border);
		border-radius: var(--radius-xl);
		padding: 40rpx 32rpx;
		margin-bottom: 24rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	/* IP 形象容器。
	   注意：全身 IP 图请使用「透明底 PNG」，此处不加边框/裁切，
	   让角色自然悬浮在 Hero 上；当前用的圆形 logo 也直接透出。 */
	.hero-mascot {
		flex-shrink: 0;
	}

	/* 圆角/描边/投影取「干正事」页 .hero-logo 的同一组值 */
	.hero-mascot :deep(.ip-img) {
		border-radius: 28rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 8rpx 24rpx var(--brand-glow-soft);
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		margin-left: 20rpx;
		flex: 1;
	}

	.hero-title {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 2rpx;
	}



	.brand-word {
		color: var(--brand);
		font-weight: 700;
	}

	/* ===== 右上角「关于我」入口 ===== */
	.hero-about {
		align-self: flex-start;
		margin-left: auto;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		height: 56rpx;
		padding: 0 22rpx;
		border-radius: 999rpx;
		background: var(--brand-light);
	}

	.hero-about-text {
		margin-left: 6rpx;
		font-size: 24rpx;
		font-weight: 500;
		color: var(--brand);
	}

	/* ===== 模式切换（毛玻璃胶囊分段） ===== */
	.mode-switch {
		display: flex;
		padding: 6rpx;
		--glass-radius: 999px;
		/* 黑金主题经 --cal-switch-bg 翻成深色玻璃（App.vue 主题块定义）；
		   页面规则会按顺序盖过 App.vue 的 .theme-thought .glassmorphism，必须就地变量化 */
		--glass-bg: var(--cal-switch-bg, rgba(255, 255, 255, 0.62));
		margin-bottom: 24rpx;
	}

	.mode-item {
		flex: 1;
		height: 84rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		position: relative;
		z-index: 1;
		transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.mode-item.active {
		background: var(--brand);
		box-shadow: 0 8rpx 24rpx var(--brand-glow);
	}

	/* 黑金主题：选中胶囊金属金三段渐变 + 周期扫光（gold-sheen 定义在 App.vue 全局） */
	.theme-thought .mode-item.active {
		position: relative;
		overflow: hidden;
		background: linear-gradient(135deg, #FFF0B0 0%, #FFD34E 45%, #E8B341 100%);
		box-shadow: 0 8rpx 24rpx rgba(232, 179, 65, 0.25),
			inset 0 0 0 1rpx rgba(255, 255, 255, 0.22);
	}

	.theme-thought .mode-item.active::after {
		content: '';
		position: absolute;
		top: -20%;
		left: 0;
		width: 34%;
		height: 140%;
		background: linear-gradient(105deg,
			transparent, rgba(255, 255, 255, 0.4) 50%, transparent);
		transform: skewX(-22deg) translateX(-220%);
		animation: gold-sheen 3.8s ease-in-out infinite;
		pointer-events: none;
	}

	.mode-text {
		margin-left: 10rpx;
		font-size: 27rpx;
		color: var(--text-secondary);
		transition: color 0.25s;
	}

	.mode-item.active .mode-text {
		color: var(--on-brand);
		font-weight: 600;
	}

	/* ===== 日历卡片 ===== */
	.calendar-card {
		margin-bottom: 24rpx;
	}

	/* 让日历组件透出毛玻璃底色（仅调整组件自身背景与分割线，不涉及 .glassmorphism）。
	   黑金主题经 --cal-content-bg 翻成 Surface 2（#1A1A1F，见 App.vue 主题块）；
	   用变量间接层而非主题选择器直写，绕开 scoped :deep 规则被编译器丢弃的问题 */
	.calendar-card :deep(.uni-calendar__content) {
		background-color: var(--cal-content-bg, transparent);
	}

	.calendar-card :deep(.uni-calendar__header) {
		border-bottom-color: var(--divider);
	}

	/* 选中 / 今天的日期形状：圆角方块（60rpx，圆角 16rpx）；
	   底色走 --brand、数字走 --on-brand，蓝色/黑色主题自动翻转 */
	.calendar-card :deep(.uni-calendar-item__weeks-box.uni-calendar-item--checked),
	.calendar-card :deep(.uni-calendar-item__weeks-box.uni-calendar-item--isDay) {
		background: transparent;
	}

	.calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--checked),
	.calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--isDay) {
		background: var(--brand);
		color: var(--on-brand);
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 16rpx;
		opacity: 1;
	}

	/* 星期栏底部细线跟随主题分割线 */
	.calendar-card :deep(.uni-calendar__weeks-day) {
		border-bottom-color: var(--divider);
	}

	/* ============================================================
	 * 黑主题（365天思考实验）下的日历文字：组件里写死的深色文字翻浅。
	 * 思考实验模式下日历打点统一走高亮金（设计稿日历圆点为金色）。
	 * ============================================================ */
	.theme-thought .calendar-card :deep(.uni-calendar__header-text) {
		color: var(--text);
	}

	.theme-thought .calendar-card :deep(.uni-calendar__backtoday) {
		color: var(--text-secondary);
		background: var(--btn-ghost-bg);
	}

	.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-box-text) {
		color: var(--text);
	}

	.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-lunar-text) {
		color: var(--text-weak);
	}

	.theme-thought .calendar-card :deep(.uni-calendar-item--disable) {
		background: transparent;
		color: var(--text-weak);
	}

	/* 选中/今天的数字块：放在深色文字覆盖之后，
	   否则上面的通用覆盖（同权重靠后）会把浅底上的数字也翻成浅色。
	   黑金主题：金属金渐变 + 顶部斜面高光 + 极弱呼吸光（反光质感） */
	.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--checked),
	.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--isDay) {
		color: var(--on-brand);
		background: linear-gradient(145deg, #FFF0B0 0%, #E8B341 100%);
		border-radius: 28rpx;
		box-shadow: 0 0 12rpx rgba(232, 179, 65, 0.18),
			inset 0 1rpx 2rpx rgba(255, 255, 255, 0.55);
		animation: cal-date-glow 2.8s ease-in-out infinite;
	}

	@keyframes cal-date-glow {
		0%, 100% { box-shadow: 0 0 8rpx rgba(232, 179, 65, 0.14),
			inset 0 1rpx 2rpx rgba(255, 255, 255, 0.55); }
		50%      { box-shadow: 0 0 18rpx rgba(232, 179, 65, 0.3),
			inset 0 1rpx 2rpx rgba(255, 255, 255, 0.55); }
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--checked),
		.theme-thought .calendar-card :deep(.uni-calendar-item__weeks-box-text.uni-calendar-item--isDay) {
			animation: none;
		}
	}

	/* 思考实验模式的打点圆点：纯金（黑金主题下） */
	.theme-thought .calendar-card :deep(.uni-calendar-mark--t) {
		background-color: #E8B341;
	}

	/* 黑金主题：翻页箭头（组件用 border 画的，写死深灰，黑底下提亮一档） */
	.theme-thought .calendar-card :deep(.uni-calendar__header-btn) {
		border-left-color: var(--text-secondary);
		border-top-color: var(--text-secondary);
	}

	/* 数字下方的「今天」小字：去掉色块，只保留品牌色文字 */
	.calendar-card :deep(.uni-calendar-item__weeks-lunar-text.uni-calendar-item--checked),
	.calendar-card :deep(.uni-calendar-item__weeks-lunar-text.uni-calendar-item--isDay) {
		background: transparent;
		color: var(--brand);
		opacity: 1;
	}

	/* ============================================================
	 * 日历打点
	 * 只显示「当前模式」有内容的日子（切到思考实验就只显示思考实验的打点）。
	 * 组件侧的 .uni-calendar-mark 已按 info 值（i / t）透传类名，
	 * 这里只需隐藏 info 的文字位（否则会显示 "i"/"t" 字样）。
	 * ============================================================ */
	.calendar-card :deep(.uni-calendar-item--extra) {
		display: none;
	}

	/* ===== 当天内容 ===== */
	.day-section {
		margin-bottom: 40rpx;
	}

	.day-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 8rpx 24rpx;
	}

	.day-date {
		display: block;
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text);
	}

	.day-label-row {
		display: flex;
		align-items: center;
		margin-top: 10rpx;
	}

	.day-label-dot {
		width: 10rpx;
		height: 10rpx;
		border-radius: 10rpx;
		background: var(--brand);
		margin-right: 10rpx;
	}

	/* 标签圆点跟随模式：专属会员分享蓝、思考实验橙 */
	.day-label-dot--image { background: #3A83F7; }
	.day-label-dot--thought { background: #F59E0B; }

	.day-label {
		font-size: 24rpx;
		color: var(--text-aux);
	}

	/* ===== 加载 / 失败 / 空状态卡片 ===== */
	.state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 64rpx 28rpx;
	}

	.state-text {
		font-size: 26rpx;
		color: var(--text-aux);
		margin-top: 20rpx;
	}

	.retry-btn {
		margin-top: 28rpx;
		min-width: 240rpx;
	}

	/* ===== 分享卡片 ===== */
	.share-card {
		margin-bottom: 20rpx;
	}

	.share-img-wrap {
		width: 100%;
		height: 400rpx;
	}

	.share-img {
		width: 100%;
		height: 400rpx;
		display: block;
	}

	.share-caption {
		display: block;
		padding: 24rpx 28rpx 0;
		font-size: 26rpx;
		color: var(--text-secondary);
		line-height: 1.6;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		word-break: break-all;
	}

	.share-foot {
		display: flex;
		align-items: center;
		padding: 20rpx 28rpx 24rpx;
	}

	.share-time {
		font-size: 22rpx;
		color: var(--text-weak);
		margin-left: 16rpx;
	}

	.share-foot-space {
		flex: 1;
	}

	/* 骨架屏的文案行容器：padding 与 .share-caption 保持一致 */
	.sk-cap {
		padding: 24rpx 28rpx 0;
	}
</style>
