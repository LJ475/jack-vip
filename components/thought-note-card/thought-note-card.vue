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
			<!-- 编辑中 -->
			<view class="thought-edit" v-if="editing">
				<view class="thought-field glassmorphism glass-input" @click.stop>
					<textarea
						class="thought-input"
						v-model="draft"
						:maxlength="MAX_LEN"
						:focus="true"
						auto-height
						placeholder="一句话记录今天的想法（200 字以内）"
						placeholder-class="ph"
						:show-confirm-bar="false"
					/>
				</view>
				<view class="thought-actions">
					<text class="thought-count">{{ draft.length }}/{{ MAX_LEN }}</text>
					<view class="thought-actions-btns">
						<button class="btn btn-ghost btn-sm" @click="cancelEdit">取消</button>
						<button class="btn btn-primary btn-sm thought-save-btn" @click="saveNote">保存</button>
					</view>
				</view>
			</view>

			<!-- 已记录：查看 + 修改入口 -->
			<view class="thought-view" v-else-if="noteText">
				<text class="thought-text">{{ noteText }}</text>
				<view class="thought-view-foot">
					<text class="thought-hint" v-if="noteUpdatedAt">记录于 {{ noteUpdatedAt }}</text>
					<view class="thought-view-foot-space"></view>
					<button class="btn btn-ghost btn-sm" @click="startEdit">修改</button>
				</view>
			</view>

			<!-- 未记录：引导 -->
			<view class="thought-view thought-view-empty" v-else>
				<text class="thought-placeholder">这一天还没有记录，写下一句自己的想法吧</text>
				<button class="btn btn-primary btn-sm thought-start-btn" @click="startEdit">去记录</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
	/** 记录归属的日期 YYYY-MM-DD */
	date: { type: String, default: '' }
})

const STORAGE_KEY = 'thoughtNotes'
const MAX_LEN = 200

function pad(n) {
	return String(n).padStart(2, '0')
}

function dateKey(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function loadNotes() {
	try {
		const n = uni.getStorageSync(STORAGE_KEY)
		return (n && typeof n === 'object' && !Array.isArray(n)) ? n : {}
	} catch (e) {
		return {}
	}
}

const expanded = ref(false)
const editing = ref(false)
const noteText = ref('')
const noteUpdatedAt = ref('')
const draft = ref('')
const streak = ref(0)

/** 某天是否有有效记录 */
function hasNote(notes, d) {
	const rec = notes[dateKey(d)]
	return !!(rec && rec.text && String(rec.text).trim())
}

/** 连续记录天数：从今天往前数；今天还没记不打断连续（从昨天起算） */
function calcStreak(notes) {
	const t = new Date()
	if (!hasNote(notes, t)) t.setDate(t.getDate() - 1)
	let count = 0
	while (hasNote(notes, t) && count < 3660) {
		count++
		t.setDate(t.getDate() - 1)
	}
	return count
}

/** 切换日期时收起并重读当天的记录 */
function refresh() {
	const notes = loadNotes()
	const rec = notes[props.date]
	noteText.value = (rec && rec.text) || ''
	noteUpdatedAt.value = (rec && rec.updatedAt) || ''
	streak.value = calcStreak(notes)
	expanded.value = false
	editing.value = false
	draft.value = ''
}

watch(() => props.date, refresh, { immediate: true })

/** 点标题行：展开/收起；没记录过的日期展开时直接进入编辑 */
function toggleExpand() {
	if (expanded.value) {
		expanded.value = false
		editing.value = false
		draft.value = ''
		return
	}
	expanded.value = true
	if (!noteText.value) {
		draft.value = ''
		editing.value = true
	}
}

function startEdit() {
	draft.value = noteText.value
	editing.value = true
}

function cancelEdit() {
	editing.value = false
	draft.value = ''
	// 没有任何记录时取消：直接收起，避免停在空引导页
	if (!noteText.value) expanded.value = false
}

function saveNote() {
	const text = (draft.value || '').trim()
	if (!text) {
		uni.showToast({ title: '先写点什么吧', icon: 'none' })
		return
	}
	try {
		const notes = loadNotes()
		const t = new Date()
		const updatedAt = `${dateKey(t)} ${pad(t.getHours())}:${pad(t.getMinutes())}`
		notes[props.date] = { text, updatedAt }
		uni.setStorageSync(STORAGE_KEY, notes)
		noteUpdatedAt.value = updatedAt
	} catch (e) {
		uni.showToast({ title: '保存失败，请重试', icon: 'none' })
		return
	}
	noteText.value = text
	streak.value = calcStreak(loadNotes())
	editing.value = false
	uni.showToast({ title: '已记录', icon: 'success' })
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

	/* ===== 编辑 ===== */
	.thought-edit {
		padding: 0 28rpx 24rpx;
	}

	.thought-field {
		display: flex;
		width: 100%;
		padding: 16rpx 20rpx;
		box-sizing: border-box;
	}

	.thought-input {
		flex: 1;
		width: 100%;
		min-height: 120rpx;
		font-size: 26rpx;
		color: var(--text);
		line-height: 1.6;
		background: transparent;
		border: none;
		padding: 0;
	}

	.thought-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 20rpx;
	}

	.thought-count {
		font-size: 22rpx;
		color: var(--text-weak);
	}

	.thought-actions-btns {
		display: flex;
		align-items: center;
	}

	.thought-save-btn {
		margin-left: 16rpx;
	}
</style>
