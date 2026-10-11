<template>
	<view class="page archive-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<app-nav-bar title="往期回顾" align="center" />

		<text class="ar-sum" v-if="notes.length">共 {{ notes.length }} 篇 · 按月份分组</text>

		<template v-for="m in shownGroups" :key="m.month">
			<view class="ar-month">
				<text class="ar-month-text">{{ m.label }}</text>
				<text class="ar-month-count">{{ m.items.length }} 篇</text>
			</view>
			<view
				class="ar-item"
				v-for="n in m.items"
				:key="n.id"
				@click="openNote(n)"
			>
				<view class="ar-item-main">
					<text class="ar-item-day">{{ dayText(n.date) }}</text>
					<text class="ar-item-text">{{ firstLine(n.text) }}</text>
				</view>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
		</template>

		<view class="ar-empty" v-if="!notes.length">
			<uni-icons type="compose" size="26" color="var(--text-weak)" />
			<text class="ar-empty-text">还没有写过，回日历点开本子写第一篇吧</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAllNotes } from '@/utils/thought-notes.js'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const notes = ref([])
// 一年 300+ 篇全铺出来太重，先给 30 条，滚到底再补（同 2030 列表的做法）
const shown = ref(30)

/** 按月份分组（新→旧），组内保持 getAllNotes 的顺序 */
const groups = computed(() => {
	const map = new Map()
	notes.value.forEach((n) => {
		const month = (n.date || '').slice(0, 7)
		if (!map.has(month)) map.set(month, [])
		map.get(month).push(n)
	})
	return [...map.entries()].map(([month, items]) => ({
		month,
		label: month.replace('-', '.'),
		items
	}))
})

/** 分批：按篇数截断，但保留完整的月份分组结构 */
const shownGroups = computed(() => {
	let left = shown.value
	const out = []
	for (const g of groups.value) {
		if (left <= 0) break
		const items = g.items.slice(0, left)
		left -= items.length
		out.push({ ...g, items })
	}
	return out
})

function firstLine(text) {
	const line = String(text || '').split('\n')[0].trim()
	return line || '（空白）'
}

function dayText(date) {
	const d = new Date((date || '').replace(/-/g, '/'))
	if (isNaN(d.getTime())) return date || ''
	return `${date.slice(5).replace('-', '.')} ${WEEKDAYS[d.getDay()]}`
}

function openNote(n) {
	uni.navigateTo({
		url: `/pages/thought-notebook/index?date=${encodeURIComponent(n.date)}&id=${encodeURIComponent(n.id)}`
	})
}

function refresh() {
	notes.value = getAllNotes()
	shown.value = 30
}

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
	refresh()
})
</script>

<style scoped>
	.archive-page {
		/* 底色走变量：scoped 选择器优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--ar-bg: linear-gradient(135deg, #edf4ff, #f8fbff);
		min-height: 100vh;
		background: var(--ar-bg);
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 16rpx) 24rpx calc(env(safe-area-inset-bottom) + 24rpx);
	}

	.archive-page.theme-thought {
		--ar-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
	}




	.ar-sum {
		display: block;
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
		margin: 8rpx 0 20rpx 6rpx;
	}

	.ar-month {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin: 26rpx 6rpx 12rpx;
	}

	.ar-month-text {
		font-size: calc(26rpx * var(--fs, 1));
		font-weight: 600;
		color: var(--text);
	}

	.ar-month-count {
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
	}

	.ar-item {
		display: flex;
		align-items: center;
		padding: 24rpx 26rpx;
		margin-bottom: 14rpx;
		background: rgba(255, 255, 255, 0.72);
		border: 1rpx solid rgba(255, 255, 255, 0.7);
		border-radius: 28rpx;
		box-shadow: 0 6rpx 22rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .ar-item {
		background: rgba(20, 20, 25, 0.92);
		border-color: #2A2A32;
		box-shadow: 0 6rpx 22rpx rgba(0, 0, 0, 0.3);
	}

	.ar-item-main {
		flex: 1;
		min-width: 0;
		margin-right: 12rpx;
	}

	.ar-item-day {
		display: block;
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-bottom: 8rpx;
	}

	.ar-item-text {
		display: block;
		font-size: calc(28rpx * var(--fs, 1));
		color: var(--text-secondary);
		line-height: 1.5;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.ar-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 120rpx 0;
	}

	.ar-empty-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-weak);
		margin-top: 20rpx;
	}
</style>
