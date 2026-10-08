<template>
	<view v-if="visible">
		<view class="sheet-mask" @click="close"></view>
		<view class="sheet" @click="dismissInput">
			<view class="sheet-inner glassmorphism glass-sheet">
				<view class="vibrancy-effect"></view>
				<view class="sheet-head">
					<text class="sheet-title">新建倒计时</text>
					<view class="sheet-close" @click="close">
						<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
					</view>
				</view>
				<view class="form-wrap">
					<text class="field-label">名称</text>
					<view class="name-field glassmorphism glass-input" :class="{ 'field-focus': nameFocused }" @click.stop>
						<view class="field-icon">
							<uni-icons type="compose" size="18" :color="nameFocused ? 'var(--brand)' : 'var(--text-aux)'" />
						</view>
						<input
							class="name-input"
							v-model="title"
							placeholder="例如：专注学习 / 写代码 / 背单词"
							placeholder-class="ph"
							:maxlength="20"
							:focus="nameFocused"
							confirm-type="done"
							@focus="nameFocused = true"
							@blur="nameFocused = false"
							@confirm="onNameConfirm"
						/>
					</view>

					<text class="field-label field-gap">时长</text>
					<view class="quick-row">
						<view
							class="quick-chip"
								:class="{ active: pickedSec === q.sec, sheen: pickedSec === q.sec }"
							v-for="(q, idx) in QUICK"
							:key="idx"
							@click="applyQuick(q)"
						>
							<text class="quick-text">{{ q.label }}</text>
						</view>
					</view>

					<!-- 内嵌滚轮：uni-app 官方 picker-view 组件，
					     滚动物理/惯性/边界由组件负责，这里只做样式与取值 -->
					<view class="wheel-wrap">
						<picker-view
							class="time-wheel"
							:value="picked"
							:indicator-style="indicatorStyle"
							:mask-style="maskStyle"
							@change="onWheelChange"
						>
							<picker-view-column>
								<view class="wheel-item" v-for="(item, i) in hourList" :key="i">
									<text class="wheel-text">{{ item }}</text>
								</view>
							</picker-view-column>
							<picker-view-column>
								<view class="wheel-item" v-for="(item, i) in minList" :key="i">
									<text class="wheel-text">{{ item }}</text>
								</view>
							</picker-view-column>
							<picker-view-column>
								<view class="wheel-item" v-for="(item, i) in secList" :key="i">
									<text class="wheel-text">{{ item }}</text>
								</view>
							</picker-view-column>
						</picker-view>
					</view>

					<button class="btn btn-primary btn-lg full-btn btn-glow start-btn" @click="confirm">
						开始倒计时
					</button>
					<view class="input-tip">到点由系统闹钟响铃/震动提醒，离开应用也会继续</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const QUICK = [
	{ label: '5 分钟', sec: 300 },
	{ label: '10 分钟', sec: 600 },
	{ label: '15 分钟', sec: 900 },
	{ label: '25 分钟', sec: 1500 },
	{ label: '45 分钟', sec: 2700 }
]

const title = ref('')
const nameFocused = ref(false)
const picked = ref([0, 0, 0])

// 静态列数据
const hourList = Array.from({ length: 24 }, (_, i) => `${i} 时`)
const minList = Array.from({ length: 60 }, (_, i) => `${i} 分`)
const secList = Array.from({ length: 60 }, (_, i) => `${i} 秒`)

// 选中带样式（item 高度 80rpx，需与 .wheel-item 一致）；
// 颜色走主题 token：品牌变量随蓝色/黑色主题自动翻转（var() 在内联 style 里同样生效）
const indicatorStyle = 'height: 80rpx; background: var(--brand-light); border-top: 1rpx solid var(--brand-glow-soft); border-bottom: 1rpx solid var(--brand-glow-soft);'
const maskStyle = 'background-image: linear-gradient(to bottom, rgba(23,33,58,0.08), rgba(23,33,58,0)), linear-gradient(to top, rgba(23,33,58,0.08), rgba(23,33,58,0)); background-position: top, bottom; background-size: 100% 160rpx; background-repeat: no-repeat;'

const pickedSec = computed(() => {
	const [h, m, s] = picked.value
	return h * 3600 + m * 60 + s
})

watch(() => props.visible, (v) => {
	if (v) {
		title.value = ''
		nameFocused.value = false
		picked.value = [0, 0, 0]
	}
})

/** 点输入框以外的任意区域：直接完成输入并收起键盘 */
function dismissInput() {
	if (nameFocused.value) {
		nameFocused.value = false
		uni.hideKeyboard()
	}
}

function applyQuick(q) {
	const h = Math.floor(q.sec / 3600)
	const m = Math.floor((q.sec % 3600) / 60)
	const s = q.sec % 60
	picked.value = [h, m, s]
}

function onWheelChange(e) {
	// 内置组件 picker-view 的 change 固定为 e.detail.value（各列选中下标）
	const v = e && e.detail ? e.detail.value : null
	if (Array.isArray(v) && v.length === 3) {
		picked.value = v.map((n) => Math.max(0, Math.min(59, Number(n) || 0)))
	}
}

function close() {
	emit('close')
}

/** 键盘点「完成」后自动收起，不让输入框一直停在待输入状态 */
function onNameConfirm() {
	nameFocused.value = false
	uni.hideKeyboard()
}

function confirm() {
	const name = (title.value || '').trim()
	if (!name) {
		uni.showToast({ title: '先给倒计时起个名字', icon: 'none' })
		return
	}
	const [h, m, s] = picked.value
	const durationSeconds = h * 3600 + m * 60 + s
	if (!durationSeconds) {
		uni.showToast({ title: '时长需要大于 0 秒', icon: 'none' })
		return
	}
	emit('confirm', { title: name, hour: h, minute: m, second: s, durationSeconds })
}
</script>

<style scoped>
	/* 外层负责定位与蒙层，内层挂 .glassmorphism glass-sheet（UI 文档 3.8） */
	.sheet-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
		z-index: 999;
		animation: sheet-mask-in 0.25s ease both;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		max-height: 85vh;
		padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.sheet-inner {
		display: flex;
		flex-direction: column;
		animation: sheet-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 28rpx 16rpx;
		position: relative;
		z-index: 1;
	}

	.sheet-title {
		font-size: 32rpx;
		font-weight: 600;
		color: var(--text);
	}

	.sheet-close {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@keyframes sheet-mask-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes sheet-up {
		from {
			opacity: 0;
			transform: translateY(60rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ===== 表单内容（仅布局与排版） ===== */
	.form-wrap {
		padding: 8rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		position: relative;
		z-index: 1;
	}

	.field-gap {
		margin-top: 24rpx;
	}

	/* 名称输入：毛玻璃挂在视图容器上（input 本体透明，聚焦变品牌蓝边） */
	.name-field {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		margin-top: 12rpx;
	}

	.name-field.field-focus {
		--glass-border: var(--focus-border);
		--glass-bg: var(--focus-field-bg);
	}

	.field-icon {
		width: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.name-input {
		flex: 1;
		height: 60rpx;
		margin-left: 12rpx;
		font-size: 28rpx;
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0;
	}

	/* ===== 快捷时长 ===== */
	.quick-row {
		display: flex;
		margin-top: 16rpx;
	}

	.quick-chip {
		flex: 1;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		background: rgba(137, 148, 169, 0.12);
		margin-right: 12rpx;
	}

	.quick-chip:last-child {
		margin-right: 0;
	}

	.quick-chip.active {
		background: var(--brand-light);
	}

	.quick-text {
		font-size: 24rpx;
		color: var(--text-secondary);
	}

	.quick-chip.active .quick-text {
		color: var(--brand);
		font-weight: 600;
	}

	/* ===== 滚轮 ===== */
	.wheel-wrap {
		margin-top: 20rpx;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--wheel-bg);
		border: 1rpx solid var(--divider);
	}

	.time-wheel {
		height: 400rpx;
	}

	.wheel-item {
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.wheel-text {
		font-size: 30rpx;
		color: var(--text);
	}

	/* ===== 底部按钮 ===== */
	.start-btn {
		margin-top: 32rpx;
	}
</style>
