<template>
	<view class="thought-card glassmorphism">
		<view class="vibrancy-effect"></view>

		<!-- 标题行（日记式：默认只显示标题，点击展开/收起，防长文撑高卡片） -->
		<view class="thought-head" @click="toggleExpand">
			<view class="thought-head-info">
				<uni-icons type="compose" size="15" color="var(--warning)" />
				<text class="thought-title">365天思考实验</text>
			</view>
			<view class="thought-head-right">
				<view class="thought-streak" v-if="streak > 0">
					<uni-icons type="fire-filled" size="14" color="var(--warning)" />
					<text class="thought-streak-text">连续 {{ streak }} 天</text>
				</view>
				<uni-icons :type="expanded ? 'up' : 'down'" size="14" color="var(--text-weak)" />
			</view>
		</view>

		<!-- 展开内容 -->
		<view class="thought-body" v-if="expanded">
			<!-- 已记录：看全文 + 进本子改 -->
			<view class="thought-view" v-if="noteText">
				<text class="thought-text">{{ noteText }}</text>
				<view class="thought-view-foot">
					<text class="thought-hint" v-if="noteUpdatedAt">记录于 {{ noteUpdatedAt }}</text>
					<view class="thought-view-foot-space"></view>
					<button class="btn btn-ghost btn-sm" @click="openNotebook">写本子</button>
				</view>
			</view>

			<!-- 未记录：引导 -->
			<view class="thought-view thought-view-empty" v-else>
				<text class="thought-placeholder">这一天还没有记录，点开本子写几句自己的想法吧</text>
				<button class="btn btn-primary btn-sm thought-start-btn" @click="openNotebook">去记录</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getNote, calcStreak } from '@/utils/thought-notes.js'

const props = defineProps({
	/** 记录归属的日期 YYYY-MM-DD */
	date: { type: String, default: '' }
})

const expanded = ref(false)
const noteText = ref('')
const noteUpdatedAt = ref('')
const streak = ref(0)

/** 切换日期时收起并重读当天的记录 */
function refresh() {
	const rec = getNote(props.date)
	noteText.value = (rec && rec.text) || ''
	noteUpdatedAt.value = (rec && rec.updatedAt) || ''
	streak.value = calcStreak()
	expanded.value = false
}

watch(() => props.date, refresh, { immediate: true })

// 从本子页返回时，日历页 onShow 会调这里把刚写的内容拉回来
defineExpose({ refresh })

/** 点标题行：展开/收起 */
function toggleExpand() {
	expanded.value = !expanded.value
}

/** 打开整屏本子页写这条 */
function openNotebook() {
	uni.navigateTo({ url: `/pages/thought-notebook/index?date=${encodeURIComponent(props.date)}` })
}
</script>

<style scoped>
	.thought-card {
		margin-top: 4rpx;
	}

	/* ===== 标题行（收起态就是这一行） ===== */
	.thought-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 28rpx;
		position: relative;
		z-index: 1;
	}

	.thought-head-info {
		display: flex;
		align-items: center;
	}

	.thought-title {
		margin-left: 8rpx;
		font-size: 28rpx;
		font-weight: 600;
		color: var(--text);
	}

	.thought-head-right {
		display: flex;
		align-items: center;
	}

	.thought-streak {
		display: flex;
		align-items: center;
		margin-right: 12rpx;
	}

	.thought-streak-text {
		margin-left: 4rpx;
		font-size: 22rpx;
		font-weight: 500;
		color: var(--warning);
	}

	/* ===== 展开内容 ===== */
	.thought-body {
		position: relative;
		z-index: 1;
	}

	/* ===== 查看（已记录 / 未记录引导） ===== */
	.thought-view {
		padding: 0 28rpx 24rpx;
	}

	.thought-text {
		display: block;
		font-size: 26rpx;
		color: var(--text-secondary);
		line-height: 1.7;
		word-break: break-all;
	}

	.thought-view-foot {
		display: flex;
		align-items: center;
		margin-top: 20rpx;
	}

	.thought-view-foot-space {
		flex: 1;
	}

	.thought-hint {
		font-size: 22rpx;
		color: var(--text-weak);
	}

	.thought-view-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.thought-placeholder {
		display: block;
		font-size: 26rpx;
		color: var(--text-weak);
		line-height: 1.7;
		text-align: center;
	}

	.thought-start-btn {
		margin-top: 20rpx;
	}
</style>
