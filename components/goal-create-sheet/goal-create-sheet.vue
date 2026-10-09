<template>
	<view v-if="visible">
		<view class="sheet-mask" @click="close"></view>
		<view class="sheet" @click="dismissInput">
			<view class="sheet-inner glassmorphism glass-sheet">
				<view class="vibrancy-effect"></view>
				<view class="sheet-head">
					<text class="sheet-title">新建目标</text>
					<view class="sheet-close" @click="close">
						<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
					</view>
				</view>
				<view class="form-wrap">
					<text class="field-label">目标名称</text>
					<view class="name-field glassmorphism glass-input" :class="{ 'field-focus': nameFocused }" @click.stop>
						<view class="field-icon">
							<uni-icons type="compose" size="18" :color="nameFocused ? 'var(--brand)' : 'var(--text-aux)'" />
						</view>
						<input
							class="name-input"
							v-model="name"
							placeholder="例如：学英语 / 存钱买房"
							placeholder-class="ph"
							:maxlength="12"
							:focus="nameFocused"
							confirm-type="next"
							@focus="nameFocused = true"
							@blur="nameFocused = false"
						/>
					</view>

					<text class="field-label field-gap">一句话描述</text>
					<view class="name-field glassmorphism glass-input" :class="{ 'field-focus': descFocused }" @click.stop>
						<view class="field-icon">
							<uni-icons type="chat" size="18" :color="descFocused ? 'var(--brand)' : 'var(--text-aux)'" />
						</view>
						<input
							class="name-input"
							v-model="desc"
							placeholder="选填，例如：每天背 30 个单词"
							placeholder-class="ph"
							:maxlength="30"
							@focus="descFocused = true"
							@blur="descFocused = false"
						/>
					</view>

					<text class="field-label field-gap">{{ goalType === 'days' ? '目标天数' : '总目标量' }}</text>
					<view class="stepper glassmorphism glass-input">
						<view class="step-btn" :class="{ 'step-disabled': totalNum <= 1 }" @click.stop="stepTotal(-1)">
							<uni-icons type="minus" size="16" :color="totalNum <= 1 ? 'var(--text-weak)' : 'var(--text)'" />
						</view>
						<input
							class="step-num step-input"
							type="number"
							:value="total"
							:maxlength="3"
							@input="onTotalInput"
							@blur="clampTotal"
						/>
						<view class="step-btn" :class="{ 'step-disabled': totalNum >= 999 }" @click.stop="stepTotal(1)">
							<uni-icons type="plus" size="16" :color="totalNum >= 999 ? 'var(--text-weak)' : 'var(--text)'" />
						</view>
					</view>

					<text class="field-label field-gap">目标类型</text>
					<view class="preset-row">
						<view class="preset-chip" :class="{ active: goalType === 'days', sheen: goalType === 'days' }" @click.stop="goalType = 'days'">
							<uni-icons type="calendar" size="15" :color="goalType === 'days' ? '#fff' : 'var(--text-aux)'" />
							<text class="preset-text" :style="{ color: goalType === 'days' ? '#fff' : 'var(--text-secondary)' }">按天坚持</text>
						</view>
						<view class="preset-chip" :class="{ active: goalType === 'amount', sheen: goalType === 'amount' }" @click.stop="goalType = 'amount'">
							<uni-icons type="compose" size="15" :color="goalType === 'amount' ? '#fff' : 'var(--text-aux)'" />
							<text class="preset-text" :style="{ color: goalType === 'amount' ? '#fff' : 'var(--text-secondary)' }">按量累计</text>
						</view>
					</view>
					<text class="step-tip">{{ goalType === 'days'
						? '每天打卡一次，进度 = 打卡天数 ÷ 目标天数（如：早睡 30 天、坚持运动）'
						: '打卡时填本次完成量，进度 = 累计量 ÷ 总量（如：读完 50 本书、存钱 5 万），一天可记多笔' }}</text>

					<template v-if="goalType === 'amount'">
						<text class="field-label field-gap">进度单位</text>
						<view class="name-field glassmorphism glass-input" @click.stop>
							<view class="field-icon">
								<uni-icons type="flag-filled" size="16" color="var(--text-aux)" />
							</view>
							<input
								class="name-input"
								v-model="unitInput"
								placeholder="本 / 页 / 斤 / 元 / 小时"
								placeholder-class="ph"
								:maxlength="6"
							/>
						</view>
					</template>

					<text class="field-label field-gap">分类样式</text>
					<view class="preset-row">
						<view
							class="preset-chip"
							v-for="(p, idx) in PRESETS"
							:key="idx"
							:class="{ active: presetIndex === idx, sheen: presetIndex === idx }"
							@click.stop="presetIndex = idx"
						>
							<uni-icons :type="p.icon" size="15" :color="presetIndex === idx ? '#fff' : p.color" />
							<text class="preset-text" :style="{ color: presetIndex === idx ? '#fff' : p.color }">{{ p.tag }}</text>
						</view>
					</view>

					<button class="btn btn-primary btn-lg full-btn btn-glow start-btn" @click="confirm">保存目标</button>
					<view class="input-tip">本地保存 · 仅在本机设备中保存</view>
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

// 分类预设：一次选定 图标 + 颜色 + 标签
const PRESETS = [
	{ tag: '学习成长', icon: 'hand-up', color: '#3A83F7' },
	{ tag: '财务规划', icon: 'wallet', color: '#F0B23E' },
	{ tag: '健康生活', icon: 'heart-filled', color: '#27C68A' },
	{ tag: '创作输出', icon: 'compose', color: '#8B5CF6' },
	{ tag: '习惯养成', icon: 'flag-filled', color: '#F59E0B' },
	{ tag: '其他目标', icon: 'star-filled', color: '#8994A9' }
]

const name = ref('')
const desc = ref('')
const total = ref(10)
const goalType = ref('days')
const unitInput = ref('')
const presetIndex = ref(0)
const nameFocused = ref(false)
const descFocused = ref(false)

watch(() => props.visible, (v) => {
	if (v) {
		name.value = ''
		desc.value = ''
		total.value = 10
		goalType.value = 'days'
		unitInput.value = ''
		presetIndex.value = 0
		nameFocused.value = false
		descFocused.value = false
	}
})

// 输入框里可能停着空串或非数字，按钮和保存都按数字兜底
const totalNum = computed(() => {
	const n = parseInt(total.value, 10)
	return Number.isNaN(n) ? 1 : n
})

function onTotalInput(e) {
	// 原样收下，让用户能清空重打；失焦或保存时才收进 1~999
	total.value = e.detail.value
}

function clampTotal() {
	total.value = Math.max(1, Math.min(999, totalNum.value))
}

function stepTotal(delta) {
	total.value = Math.max(1, Math.min(999, totalNum.value + delta))
}

function dismissInput() {
	if (nameFocused.value || descFocused.value) {
		nameFocused.value = false
		descFocused.value = false
		uni.hideKeyboard()
	}
}

function close() {
	emit('close')
}

function confirm() {
	const trimmed = (name.value || '').trim()
	if (!trimmed) {
		uni.showToast({ title: '先给目标起个名字', icon: 'none' })
		return
	}
	const preset = PRESETS[presetIndex.value]
	emit('confirm', {
		name: trimmed,
		desc: (desc.value || '').trim(),
		total: Math.max(1, Math.min(999, totalNum.value)),
		type: goalType.value,
		unit: (unitInput.value || '').trim(),
		tag: preset.tag,
		icon: preset.icon,
		color: preset.color
	})
}
</script>

<style scoped>
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

	.form-wrap {
		padding: 8rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		position: relative;
		z-index: 1;
	}

	.field-label {
		display: block;
		font-size: 24rpx;
		color: var(--text-aux);
	}

	.field-gap {
		margin-top: 24rpx;
	}

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

	/* ===== 里程碑步进器 ===== */
	.stepper {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 12rpx;
		padding: 10rpx 16rpx;
		box-sizing: border-box;
	}

	.step-btn {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: var(--btn-ghost-bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.step-disabled {
		opacity: 0.4;
	}

	.step-num {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 2rpx;
	}

	/* 目标值改成可输入：固定宽度居中，去掉输入框自带的底和框 */
	.step-input {
		width: 120rpx;
		text-align: center;
		background: transparent;
		border: none;
		padding: 0;
	}

	.step-tip {
		display: block;
		font-size: 20rpx;
		color: var(--text-weak);
		margin-top: 10rpx;
	}

	/* ===== 分类预设 ===== */
	.preset-row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 12rpx;
	}

	.preset-chip {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 10rpx 18rpx;
		border-radius: 999rpx;
		background: var(--btn-ghost-bg);
		border: 1rpx solid transparent;
	}

	.preset-chip.active {
		background: var(--brand);
	}

	.preset-text {
		font-size: 22rpx;
		margin-left: 8rpx;
	}

	.start-btn {
		margin-top: 32rpx;
	}

	.input-tip {
		text-align: center;
		font-size: 20rpx;
		color: var(--text-weak);
		margin-top: 14rpx;
	}
</style>
