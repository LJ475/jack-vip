<template>
	<view class="goal-card" @click="onTap">
		<view class="goal-main">
			<!-- 骨架走同一个外壳、同一组类，只换内部内容，首帧尺寸与真卡片一致 -->
			<template v-if="loading">
				<skeleton-block w="76rpx" h="76rpx" circle />
				<view class="goal-info">
					<skeleton-block w="42%" h="30rpx" />
					<skeleton-block w="66%" h="24rpx" mt="18rpx" />
				</view>
			</template>
			<template v-else>
				<view class="goal-icon" :style="{ background: goal.color + '26' }">
					<uni-icons :type="goal.icon" size="26" :color="goal.color" />
				</view>
				<view class="goal-info">
					<view class="goal-name-row">
						<text class="goal-name">{{ goal.title }}</text>
						<text class="goal-tag" :style="{ color: goal.color, background: goal.color + '22' }">{{ goal.tag }}</text>
					</view>
					<text class="goal-desc">{{ goal.desc }}</text>
				</view>
				<view class="goal-del" @click.stop="$emit('remove')">
					<uni-icons type="trash" size="18" color="var(--text-weak)" />
				</view>
				<uni-icons type="right" size="14" color="var(--text-weak)" />
			</template>
		</view>

		<view class="goal-progress-row" v-if="!loading">
			<text class="goal-percent">{{ percent }}%</text>
			<view class="goal-bar-track">
				<view class="goal-bar-fill" :style="{ width: (barsIn ? percent : 0) + '%', background: goal.color }"></view>
			</view>
		</view>
		<view class="goal-milestone" v-if="!loading">
			<uni-icons type="flag-filled" size="12" :color="goal.color" />
			<text class="milestone-text">已打卡 {{ goal.checkins.length }} 天 · 进度 {{ fmt(current) }} / {{ goal.total }}{{ goal.unit ? ' ' + goal.unit : '' }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

// 2030 列表里的单条目标卡。独立成组件：打卡 +1、删除这类只影响一条的变化，
// 不再让整页（总览卡、其余目标、底部导航）一起重算——App 端每次整页重算都要跨逻辑层↔视图层通讯。
const props = defineProps({
	goal: { type: Object, default: () => ({}) },
	barsIn: { type: Boolean, default: false },
	loading: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'remove'])

function percentOf(g) {
	if (!g.total) return 0
	return Math.max(0, Math.min(100, Math.round((g.current / g.total) * 100)))
}

/** 进度展示：保留 1 位小数、去掉多余的 0（step<1 时 current 是小数） */
function fmt(n) {
	return String(Math.round(n * 10) / 10)
}

const percent = computed(() => percentOf(props.goal))
const current = computed(() => props.goal.current)

function onTap() {
	if (props.loading) return
	emit('open')
}
</script>

<style scoped>
	/* 这张卡不用 .glassmorphism 的 backdrop-filter：2030 页 4 张卡各带一层实时模糊，
	   滚动时每帧都要重算背后区域，是那个页面掉帧的大头。改用半透明底 + 描边 + 阴影，
	   观感接近（仍通透），但不再有每帧的模糊计算。底部那条玻璃导航栏不在此列，保留模糊。 */
	.goal-card {
		padding: 28rpx;
		margin-bottom: 24rpx;
		position: relative;
		background: rgba(255, 255, 255, 0.72);
		border: 1rpx solid rgba(255, 255, 255, 0.7);
		border-radius: 32rpx;
		box-shadow: 0 8rpx 32rpx rgba(31, 45, 61, 0.12);
	}

	.theme-thought .goal-card {
		background: rgba(20, 20, 25, 0.92);
		border-color: #2A2A32;
		border-radius: 52rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.35),
			inset 0 1rpx 0 rgba(255, 240, 200, 0.12);
	}

	.goal-main {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
	}

	/* 删除按钮：尺寸与图标取「干正事」卡片上 .timer-del 的同一组值 */
	.goal-del {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 4rpx;
		flex-shrink: 0;
	}

	.goal-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.goal-info {
		flex: 1;
		margin-left: 20rpx;
		margin-right: 16rpx;
		min-width: 0;
	}

	.goal-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.goal-name {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.goal-tag {
		font-size: 20rpx;
		line-height: 1;
		padding: 6rpx 14rpx;
		border-radius: 999rpx;
		margin-left: 14rpx;
		flex-shrink: 0;
	}

	.goal-desc {
		display: block;
		font-size: 24rpx;
		color: var(--text-aux);
		margin-top: 8rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.goal-progress-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 22rpx;
	}

	.goal-percent {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
		width: 100rpx;
		flex-shrink: 0;
	}

	.goal-bar-track {
		flex: 1;
		height: 14rpx;
		border-radius: 999rpx;
		background: rgba(137, 148, 169, 0.2);
		overflow: hidden;
	}

	.goal-bar-fill {
		height: 100%;
		border-radius: 999rpx;
		transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.goal-milestone {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 16rpx;
	}

	.milestone-text {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 8rpx;
	}
</style>
