<template>
	<view class="hm-card">
		<view class="hm-head">
			<text class="hm-title">打卡记录</text>
			<text class="hm-sub">{{ weeksText }} · 共 {{ checkins.length }} 天</text>
		</view>
		<view class="hm-grid">
			<view class="hm-col" v-for="(col, ci) in columns" :key="ci">
				<view
					class="hm-cell"
					v-for="(cell, ri) in col"
					:key="ri"
					:style="cellStyle(cell)"
				></view>
			</view>
		</view>
		<view class="hm-legend">
			<text class="hm-legend-text">越深＝那天打了卡</text>
			<view class="hm-legend-dots">
				<view class="hm-dot hm-dot--off"></view>
				<view class="hm-dot" :style="{ background: color }"></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

// 打卡热力图：一列一周、一行一天，格子 = 那天有没有打卡。
// 数据全是本机 already 有的 checkins（'YYYY-MM-DD'），不额外存任何东西。
const props = defineProps({
	checkins: { type: Array, default: () => [] },
	color: { type: String, default: '#3A83F7' },
	weeks: { type: Number, default: 26 }
})

function pad(n) {
	return String(n).padStart(2, '0')
}

function keyOf(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const weeksText = computed(() => (props.weeks >= 52 ? '近一年' : `近 ${props.weeks} 周`))

/** 末列 = 本周；每列从周一开始，7 行 */
const columns = computed(() => {
	const set = new Set(props.checkins || [])
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	// 找到本周周一（getDay: 0=周日）
	const monday = new Date(today)
	const dow = (today.getDay() + 6) % 7
	monday.setDate(monday.getDate() - dow)
	const cols = []
	for (let w = props.weeks - 1; w >= 0; w--) {
		const col = []
		for (let d = 0; d < 7; d++) {
			const day = new Date(monday)
			day.setDate(monday.getDate() - w * 7 + d)
			const future = day.getTime() > today.getTime()
			col.push({ on: !future && set.has(keyOf(day)), future })
		}
		cols.push(col)
	}
	return cols
})

function cellStyle(cell) {
	if (cell.future) return { opacity: '0' }
	return cell.on ? { background: props.color } : {}
}
</script>

<style scoped>
	.hm-card {
		padding: 28rpx;
		margin-top: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		border: 1rpx solid rgba(255, 255, 255, 0.7);
		border-radius: 32rpx;
		box-shadow: 0 8rpx 32rpx rgba(31, 45, 61, 0.12);
	}

	.theme-thought .hm-card {
		background: rgba(20, 20, 25, 0.92);
		border-color: #2A2A32;
		border-radius: 52rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.35),
			inset 0 1rpx 0 rgba(255, 240, 200, 0.12);
	}

	.hm-head {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.hm-title {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--text);
	}

	.hm-sub {
		font-size: 22rpx;
		color: var(--text-aux);
	}

	.hm-grid {
		display: flex;
		flex-direction: row;
	}

	.hm-col {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.hm-cell {
		height: 22rpx;
		margin: 2rpx;
		border-radius: 4rpx;
		background: rgba(137, 148, 169, 0.18);
	}

	.hm-legend {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-top: 18rpx;
	}

	.hm-legend-text {
		font-size: 20rpx;
		color: var(--text-weak);
	}

	.hm-legend-dots {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.hm-dot {
		width: 18rpx;
		height: 18rpx;
		border-radius: 4rpx;
		margin-left: 8rpx;
	}

	.hm-dot--off {
		background: rgba(137, 148, 169, 0.18);
	}
</style>
