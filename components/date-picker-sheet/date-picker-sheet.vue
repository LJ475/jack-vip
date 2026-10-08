<template>
	<view v-if="visible" class="dp-root">
		<view class="sheet-mask" @click="close"></view>
		<view class="sheet">
			<view class="sheet-inner glassmorphism glass-sheet">
				<view class="vibrancy-effect"></view>
				<view class="dp-head">
					<text class="dp-cancel" @click="close">取消</text>
					<text class="sheet-title">{{ title }}</text>
					<text class="dp-confirm sheen" @click="confirm">完成</text>
				</view>
				<picker-view class="dp-wheel" :value="wheelIndex" @change="onWheelChange">
					<picker-view-column>
						<view class="dp-cell" v-for="y in years" :key="y">
							<text class="dp-cell-text">{{ y }}年</text>
						</view>
					</picker-view-column>
					<picker-view-column>
						<view class="dp-cell" v-for="m in 12" :key="m">
							<text class="dp-cell-text">{{ pad(m) }}月</text>
						</view>
					</picker-view-column>
					<picker-view-column>
						<view class="dp-cell" v-for="d in dayList" :key="d">
							<text class="dp-cell-text">{{ pad(d) }}日</text>
						</view>
					</picker-view-column>
				</picker-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false },
	// 'YYYY-MM-DD'
	value: { type: String, default: '' },
	// 年份范围（与旧版 <picker mode="date"> 的 start/end 一致）
	start: { type: String, default: '2026-01-01' },
	end: { type: String, default: '2049-12-31' },
	title: { type: String, default: '选择日期' }
})

const emit = defineEmits(['close', 'change'])

const startYear = computed(() => Number((props.start || '').slice(0, 4)) || 2026)
const endYear = computed(() => Number((props.end || '').slice(0, 4)) || 2049)

const years = computed(() => {
	const list = []
	for (let y = startYear.value; y <= endYear.value; y++) list.push(y)
	return list
})

const sel = ref({ y: 2030, m: 12, d: 31 })
const wheelIndex = ref([0, 0, 0])

/** 当月天数（随年/月联动，闰年自动正确） */
const dayList = computed(() => {
	const total = new Date(sel.value.y, sel.value.m, 0).getDate()
	const list = []
	for (let d = 1; d <= total; d++) list.push(d)
	return list
})

// 弹层每次打开都把滚轮对齐到 value
watch(() => props.visible, (v) => {
	if (v) syncFromValue()
})

function syncFromValue() {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.value || '')
	const now = new Date()
	sel.value = {
		y: m ? Number(m[1]) : now.getFullYear(),
		m: m ? Number(m[2]) : now.getMonth() + 1,
		d: m ? Number(m[3]) : now.getDate()
	}
	if (sel.value.y < startYear.value) sel.value.y = startYear.value
	if (sel.value.y > endYear.value) sel.value.y = endYear.value
	const maxD = new Date(sel.value.y, sel.value.m, 0).getDate()
	if (sel.value.d > maxD) sel.value.d = maxD
	wheelIndex.value = [
		Math.max(0, years.value.indexOf(sel.value.y)),
		sel.value.m - 1,
		sel.value.d - 1
	]
}

function onWheelChange(e) {
	const v = (e && e.detail && e.detail.value) || []
	const y = years.value[v[0]] != null ? years.value[v[0]] : sel.value.y
	const m = Math.min(12, Math.max(1, (v[1] || 0) + 1))
	const maxD = new Date(y, m, 0).getDate()
	const d = Math.min(maxD, Math.max(1, (v[2] || 0) + 1))
	sel.value = { y, m, d }
	// 天数列变短（如 1月31 → 2月28）时把日轮位置夹回去
	wheelIndex.value = [v[0], v[1], Math.min(v[2] || 0, maxD - 1)]
}

function pad(n) {
	return String(n).padStart(2, '0')
}

function confirm() {
	emit('change', `${sel.value.y}-${pad(sel.value.m)}-${pad(sel.value.d)}`)
	close()
}

function close() {
	emit('close')
}
</script>

<style scoped>
	.dp-root {
		/* 滚轮上下遮罩的淡出色（深色主题下由 .theme-thought 翻黑） */
		--dp-fade: 255, 255, 255;
	}

	.theme-thought .dp-root {
		--dp-fade: 20, 20, 25;
	}

	/* ===== 弹层骨架（与页面内弹层同款） ===== */
	.sheet-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
		z-index: 999;
		animation: dp-mask-in 0.25s ease both;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
	}

	.sheet-inner {
		display: flex;
		flex-direction: column;
		animation: dp-sheet-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
	}

	@keyframes dp-mask-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes dp-sheet-up {
		from {
			opacity: 0;
			transform: translateY(60rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ===== 头部：取消 / 标题 / 完成 ===== */
	.dp-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 28rpx 0;
		position: relative;
		z-index: 1;
	}

	.dp-cancel {
		font-size: 28rpx;
		color: var(--text-aux);
		padding: 10rpx 4rpx;
	}

	.dp-confirm {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--brand);
		padding: 10rpx 4rpx;
	}

	/* ===== 滚轮 ===== */
	/* 行高用固定 px：指示器高度变量会被 uni 运行时样式消费，rpx 不会被换算 */
	.dp-wheel {
		height: 220px;
		position: relative;
		z-index: 1;
		--picker-view-column-indicator-height: 44px;
	}

	.dp-cell {
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dp-cell-text {
		font-size: 32rpx;
		color: var(--text);
	}

	/* 选中行上下边线与滚动遮罩淡出色 */
	.dp-wheel :deep(.uni-picker-view-indicator:before),
	.dp-wheel :deep(.uni-picker-view-indicator:after) {
		border-color: var(--border-soft);
	}

	.dp-wheel :deep(.uni-picker-view-mask) {
		background-image: linear-gradient(180deg, rgba(var(--dp-fade), 0.92), rgba(var(--dp-fade), 0)),
			linear-gradient(0deg, rgba(var(--dp-fade), 0.92), rgba(var(--dp-fade), 0));
	}
</style>
