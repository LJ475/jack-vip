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
			'is-float': float && !paused,
			'is-sway': sway && !paused,
			'is-enter': entered,
			'is-pressed': pressed
		}"
		:style="rootStyle"
		@click="onTap"
		@touchstart="onTouchStart"
		@touchend="onTouchEnd"
		@touchcancel="onTouchEnd"
	>
		<!-- 底部柔和光晕（让 IP 有「站」在光上的感觉，可关闭） -->
		<view class="ip-shadow" v-if="shadow"></view>

		<!-- IP 图：默认渲染传入的 src；也可用插槽完全自定义内部结构 -->
		<view class="ip-bounce-wrap" :class="{ 'is-bounce': bouncing }">
			<view class="ip-body">
				<slot>
					<image class="ip-img" :src="src" mode="aspectFit" />
				</slot>
			</view>
		</view>

		<!-- 点击时冒出的小气泡（交互反馈，可关闭） -->
		<view class="ip-bubble" v-if="bubbling">{{ bubbleText }}</view>
	</view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

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
	tappable: { type: Boolean, default: true }
})

const emit = defineEmits(['tap'])

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
		font-size: 22rpx;
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
		.ip-shadow {
			animation: none !important;
			transition: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
