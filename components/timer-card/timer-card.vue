<template>
	<view class="timer-card glassmorphism" @click="onTap">
		<view class="timer-info">
			<template v-if="loading">
				<skeleton-block w="36%" h="28rpx" />
				<skeleton-block w="58%" h="52rpx" mt="14rpx" />
				<skeleton-block w="30%" h="22rpx" mt="14rpx" />
			</template>
			<template v-else>
				<text class="timer-title">{{ timer.title }}</text>
				<timer-countdown class="timer-duration" :timer="timer" />
				<text class="timer-meta">{{ metaText }}</text>
			</template>
		</view>

		<template v-if="!loading">
			<view class="timer-del" @click.stop="$emit('remove')">
				<uni-icons type="trash" size="18" color="var(--text-weak)" />
			</view>
			<view class="timer-action">
				<button v-if="timer.status === TIMER_STATUS.IDLE" class="btn btn-primary btn-sm" @click.stop="$emit('start')">开始</button>
				<button v-else-if="timer.status === TIMER_STATUS.FAILED" class="btn btn-danger-plain btn-sm" @click.stop="$emit('start')">重新启动</button>
				<view v-else-if="timer.status === TIMER_STATUS.RUNNING" class="tag tag-primary">进行中</view>
				<view v-else class="tag tag-success">已完成</view>
			</view>
		</template>
		<skeleton-block v-else w="132rpx" h="56rpx" r="999rpx" />
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { TIMER_STATUS } from '@/api/countdown.js'

// 干正事的单条倒计时卡。独立成组件：某一条开始/完成/删除时只重渲染这一行，
// 不再让整页（新建入口、提示卡、弹层、底部导航）跟着一起重算。
// 卡片里跟秒针跳的数字另外抽在 timer-countdown 里，父页面因此完全不被秒级更新触发。
const props = defineProps({
	timer: { type: Object, default: () => ({}) },
	loading: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'remove', 'start'])

const metaText = computed(() => {
	switch (props.timer.status) {
		case TIMER_STATUS.IDLE: return '系统闹钟 · 未启动'
		case TIMER_STATUS.RUNNING: return '系统闹钟 · 已设'
		case TIMER_STATUS.COMPLETED: return '系统闹钟 · 已完成'
		case TIMER_STATUS.FAILED: return '系统闹钟 · 启动失败'
		default: return ''
	}
})

function onTap() {
	if (props.loading) return
	emit('open')
}
</script>

<style scoped>
	.timer-card {
		display: flex;
		align-items: center;
		padding: 32rpx 28rpx;
		margin-bottom: 24rpx;
	}

	.timer-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		margin-right: 20rpx;
	}

	.timer-title {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.timer-duration {
		font-size: 44rpx;
		font-weight: 700;
		color: var(--brand);
		margin-top: 12rpx;
		letter-spacing: 1rpx;
	}

	.timer-meta {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-top: 10rpx;
	}

	.timer-action {
		flex-shrink: 0;
	}

	.timer-del {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 12rpx;
		flex-shrink: 0;
	}
</style>
