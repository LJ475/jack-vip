<template>
	<view class="page detail-page" :class="{ 'theme-thought': isThoughtTheme }" :style="goal ? { '--goal-accent': goal.color } : {}" v-if="goal">

		<!-- ① 顶部导航：返回 + 标题 + 更多 -->
		<view class="nav">
			<view class="nav-side" @click="goBack">
				<uni-icons type="left" size="20" color="var(--text)" />
			</view>
			<text class="nav-title">目标详情</text>
			<view class="nav-side" @click="onMore">
				<uni-icons type="more-filled" size="20" color="var(--text)" />
			</view>
		</view>

		<!-- ② 目标概览卡 -->
		<view class="overview-card">
			<view class="ov-main">
				<view class="ov-icon" :style="{ background: goal.color + '2E' }">
					<uni-icons :type="goal.icon" size="30" :color="goal.color" />
				</view>
				<view class="ov-info">
					<view class="ov-name-row">
						<text class="ov-name">{{ goal.title }}</text>
						<text class="ov-tag" :style="{ color: goal.color, background: goal.color + '22' }">{{ goal.tag }}</text>
					</view>
					<text class="ov-desc">{{ goal.desc }}</text>
				</view>
			</view>
			<view class="ov-foot">
				<view class="ov-foot-left">
					<uni-icons type="flag-filled" size="12" color="var(--text-aux)" />
					<text class="ov-foot-text">{{ startMonthText }} — {{ endText }}</text>
				</view>
				<view class="ov-chip">
					<uni-icons type="calendar" size="12" color="var(--text-aux)" />
					<text class="ov-chip-text">长期目标</text>
				</view>
			</view>
		</view>

		<!-- ③ 总体进度卡 -->
		<view class="progress-card glassmorphism">
			<view class="progress-top">
				<view class="ring" :class="{ 'ring--pop': ringPop }" :style="{ background: ringBg }">
					<view class="ring-hole">
						<text class="ring-pct">{{ pctText }}%</text>
						<text class="ring-label">完成度</text>
					</view>
				</view>
					<view class="progress-nums">
						<view class="num-col">
							<text class="num-label">已完成</text>
							<view class="num-row">
								<text class="num-big">{{ fmtProgress(goal.current) }}</text>
								<text class="num-unit">{{ goal.unit }}</text>
							</view>
						</view>
					<view class="num-divider"></view>
					<view class="num-col">
						<text class="num-label">总目标</text>
						<view class="num-row">
							<text class="num-big">{{ goal.total }}</text>
							<text class="num-unit">{{ goal.unit }}</text>
						</view>
					</view>
				</view>
			</view>
			<view class="progress-bar-track">
				<view class="progress-bar-fill" :style="barStyle"></view>
			</view>
			<view class="progress-cheer">
				<uni-icons type="flag-filled" size="12" :color="goal.color" />
				<text class="cheer-text">{{ cheerText }}</text>
			</view>
		</view>

		<!-- ④ 每日打卡（每天一次，独立于目标进度，只记习惯连续性） -->
		<view class="checkin-card glassmorphism">
			<view class="card-head-row">
				<view class="card-head-left">
					<uni-icons type="checkbox-filled" size="16" :color="goal.color" />
					<text class="card-head-title">每日打卡</text>
				</view>
				<text class="card-head-extra">{{ checkinSummary }}</text>
			</view>
			<view class="checkin-week">
				<view class="checkin-day" v-for="d in recentDays" :key="d.date">
					<text class="checkin-day-label" :class="{ 'checkin-day-label--today': d.today }">{{ d.label }}</text>
					<view class="checkin-dot" :class="{ 'checkin-dot--on': d.on, 'checkin-dot--today': d.today && !d.on }"></view>
				</view>
			</view>
			<button
				class="btn btn-lg full-btn checkin-btn"
				:class="isDaysType && checkedToday ? 'checkin-btn--done' : 'checkin-btn--go sheen'"
				@click="onCheckinTap"
			>
				<uni-icons
					:type="isDaysType && checkedToday ? 'checkmarkempty' : 'calendar-filled'"
					size="18"
					:color="isDaysType && checkedToday ? goal.color : '#FFFFFF'"
				/>
				<text class="checkin-btn-text">{{ checkinBtnText }}</text>
			</button>
		</view>

		<!-- ⑤ 里程碑计划 -->
		<view class="ms-card glassmorphism">
			<view class="card-head-row">
				<view class="card-head-left">
					<uni-icons type="medal" size="16" :color="goal.color" />
					<text class="card-head-title">里程碑</text>
				</view>
				<text class="card-head-extra">已完成 {{ goal.current }} / {{ goal.total }}</text>
			</view>

			<view class="ms-empty" v-if="!goal.milestones.length">
				<text class="ms-empty-text">还没有里程碑计划</text>
			</view>

			<view class="ms-list" v-else>
				<view class="ms-item" v-for="(m, idx) in goal.milestones" :key="idx">
					<view class="ms-dot-col">
						<view class="ms-dot" :class="'ms-dot--' + msStatus(m)">
							<uni-icons
								v-if="msStatus(m) === 'done'"
								type="checkmarkempty"
								size="12"
								color="#ffffff"
							/>
						</view>
						<view class="ms-line" v-if="idx < goal.milestones.length - 1"></view>
					</view>
					<view class="ms-body">
						<view class="ms-row">
							<text class="ms-name">{{ m.name }}</text>
							<text class="ms-nums">{{ m.done }} / {{ m.target }}</text>
						</view>
						<text class="ms-desc" v-if="m.desc">{{ m.desc }}</text>
						<text class="ms-date" v-if="m.date">{{ m.date }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- ⑥ 目标记录 -->
		<view class="record-card glassmorphism">
			<view class="card-head-row">
				<view class="card-head-left">
					<uni-icons type="calendar-filled" size="16" :color="goal.color" />
					<text class="card-head-title">目标记录</text>
				</view>
				<view class="record-add" @click="openRecordSheet">
					<uni-icons type="plus" size="14" color="var(--brand)" />
					<text class="record-add-text">添加记录</text>
				</view>
			</view>

			<view class="record-empty" v-if="!goal.records.length">
				<text class="record-empty-text">还没有记录，去完成第一件事并记录下来吧</text>
			</view>

			<template v-else>
				<view class="record-list">
					<view class="record-item" v-for="(r, idx) in recordsShown" :key="idx">
						<view class="record-dot"></view>
						<text class="record-date">{{ r.date }}</text>
						<text class="record-text">{{ r.text }}</text>
						<text class="record-tag">{{ r.tag }}</text>
					</view>
				</view>
				<view class="record-expand" v-if="goal.records.length > 3" @click="recordsExpanded = !recordsExpanded">
					<text class="record-expand-text">{{ recordsExpanded ? '收起记录' : '查看全部记录' }}</text>
					<uni-icons :type="recordsExpanded ? 'up' : 'down'" size="12" color="var(--text-aux)" />
				</view>
			</template>
		</view>

		<!-- ⑦ 底部主操作 -->
		<view class="actions">
			<button class="btn btn-ghost flex-1" @click="openRecordSheet">添加记录</button>
			<button class="btn btn-primary flex-1 action-edit" @click="openEditSheet">编辑目标</button>
		</view>
		<view class="safe-bottom"></view>

		<!-- 编辑目标弹层 -->
		<view v-if="editVisible">
			<view class="sheet-mask" @click="editVisible = false"></view>
			<view class="sheet">
				<view class="sheet-inner glassmorphism glass-sheet">
					<view class="vibrancy-effect"></view>
					<view class="sheet-head">
						<text class="sheet-title">编辑目标</text>
						<view class="sheet-close" @click="editVisible = false">
							<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
						</view>
					</view>
					<view class="form-wrap">
						<text class="field-label">目标名称</text>
						<view class="form-field glassmorphism glass-input" @click.stop>
							<input class="form-input" v-model="editTitle" :maxlength="12" placeholder="目标名称" placeholder-class="ph" />
						</view>
						<text class="field-label field-gap">一句话描述</text>
						<view class="form-field glassmorphism glass-input" @click.stop>
							<input class="form-input" v-model="editDesc" :maxlength="30" placeholder="选填" placeholder-class="ph" />
						</view>
						<text class="field-label field-gap">总目标值</text>
						<view class="form-stepper">
							<view class="step-btn" @click="stepEditTotal(-1)">
								<uni-icons type="minus" size="16" color="var(--text)" />
							</view>
							<input
								class="step-num step-input"
								type="number"
								:value="editTotal"
								:maxlength="3"
								@input="onEditTotalInput"
								@blur="clampEditTotal"
							/>
							<view class="step-btn" @click="stepEditTotal(1)">
								<uni-icons type="plus" size="16" color="var(--text)" />
							</view>
						</view>
						<template v-if="goal.type === 'amount'">
							<text class="field-label field-gap">进度单位</text>
							<view class="form-field glassmorphism glass-input" @click.stop>
								<input class="form-input" v-model="editUnit" :maxlength="6" placeholder="本 / 页 / 斤 / 元" placeholder-class="ph" />
							</view>
						</template>
						<button class="btn btn-primary btn-lg full-btn start-btn" @click="saveEdit">保存修改</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 添加记录弹层 -->
		<view v-if="recordVisible">
			<view class="sheet-mask" @click="recordVisible = false"></view>
			<view class="sheet">
				<view class="sheet-inner glassmorphism glass-sheet">
					<view class="vibrancy-effect"></view>
					<view class="sheet-head">
						<text class="sheet-title">添加记录</text>
						<view class="sheet-close" @click="recordVisible = false">
							<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
						</view>
					</view>
					<view class="form-wrap">
						<text class="field-label">记录内容</text>
						<view class="form-field glassmorphism glass-input" @click.stop>
							<input class="form-input" v-model="recordText" :maxlength="40" placeholder="例如：读完第 22 本书《自控力》" placeholder-class="ph" />
						</view>
						<text class="field-label field-gap" v-if="goal.milestones.length">关联里程碑（完成一次推进 +1）</text>
						<view class="ms-pick-row" v-if="goal.milestones.length">
							<view
								class="ms-pick"
								v-for="(m, idx) in goal.milestones"
								:key="idx"
								:class="{ active: recordMsIndex === idx, 'ms-pick--done': msStatus(m) === 'done' }"
								@click="recordMsIndex = idx"
							>
								<text class="ms-pick-text">{{ m.name }}</text>
							</view>
						</view>
						<button class="btn btn-primary btn-lg full-btn start-btn" @click="saveRecord">保存记录</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 数值打卡弹层（按量累计型：记一笔完成量，一天可多次） -->
		<view v-if="amountVisible">
			<view class="sheet-mask" @click="amountVisible = false"></view>
			<view class="sheet">
				<view class="sheet-inner glassmorphism glass-sheet">
					<view class="vibrancy-effect"></view>
					<view class="sheet-head">
						<text class="sheet-title">今日打卡</text>
						<view class="sheet-close" @click="amountVisible = false">
							<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
						</view>
					</view>
					<view class="form-wrap">
						<text class="field-label">本次完成量{{ goal.unit ? '（' + goal.unit + '）' : '' }}</text>
						<view class="form-field glassmorphism glass-input" @click.stop>
							<input class="form-input" v-model="amountInput" type="digit" placeholder="例如：1" placeholder-class="ph" />
						</view>
						<text class="field-label field-gap">已累计 {{ fmtProgress(goal.current) }} / {{ goal.total }}{{ goal.unit ? ' ' + goal.unit : '' }}</text>
						<button class="btn btn-primary btn-lg full-btn start-btn" @click="saveAmount">记入进度</button>
					</view>
				</view>
			</view>
		</view>

		<view class="safe-bottom"></view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'

const STORAGE_KEY = 'goals2030'

const goal = ref(null)
const isThoughtTheme = ref(false)
const startMonthText = ref('2026.08')
const endDate = ref('2030-12-31')

const endText = computed(() => (endDate.value || '2030-12-31').slice(0, 7).replace('-', '.'))

const editVisible = ref(false)
const editTitle = ref('')
const editDesc = ref('')
const editTotal = ref(10)
const editUnit = ref('')

const recordVisible = ref(false)
const recordText = ref('')
const recordMsIndex = ref(-1)
const recordsExpanded = ref(false)

function pad(n) {
	return String(n).padStart(2, '0')
}

function loadFromStorage() {
	try {
		const saved = uni.getStorageSync(STORAGE_KEY)
		if (saved && Array.isArray(saved.goals)) return saved
	} catch (e) { /* 忽略 */ }
	return { goals: [], startMonth: '2026.08', endDate: '2030-12-31' }
}

/** 旧格式迁移（与列表页 normalizeGoal 一致，本页自包含）。
 * 进度按类型推导（均封顶总目标）：
 * days（按天坚持）= 打卡天数；amount（按量累计）= amounts 完成量累加 */
function normalizeGoal(raw) {
	if (!raw || typeof raw !== 'object') return null
	const total = Number(raw.total != null ? raw.total : (raw.targetValue != null ? raw.targetValue : 10)) || 10
	const checkins = Array.isArray(raw.checkins) ? raw.checkins : []
	const amounts = Array.isArray(raw.amounts) ? raw.amounts : []
	const type = raw.type === 'amount' ? 'amount' : 'days'
	const sum = amounts.reduce((s, a) => s + (Number(a && a.value) || 0), 0)
	return {
		id: raw.id || `g${Date.now()}`,
		title: raw.title || raw.name || '未命名目标',
		tag: raw.tag || '我的目标',
		icon: raw.icon || 'star-filled',
		color: raw.color || '#3A83F7',
		desc: raw.desc || raw.description || '持续推进中',
		current: type === 'amount' ? Math.min(total, Math.round(sum * 10) / 10) : Math.min(total, checkins.length),
		total,
		type,
		amounts,
		unit: raw.unit || '',
		milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
		records: Array.isArray(raw.records) ? raw.records : [],
		checkins,
		status: raw.status || 'active'
	}
}

/** 进度展示：保留 1 位小数、去掉多余的 0（按量累计的 current 是小数） */
function fmtProgress(n) {
	return String(Math.round(n * 10) / 10)
}

/** 由打卡数据重算进度（两种类型统一出口，落盘前调用） */
function recomputeCurrent() {
	if (!goal.value) return
	if (goal.value.type === 'amount') {
		const sum = goal.value.amounts.reduce((s, a) => s + (Number(a && a.value) || 0), 0)
		goal.value.current = Math.min(goal.value.total, Math.round(sum * 10) / 10)
	} else {
		goal.value.current = Math.min(goal.value.total, goal.value.checkins.length)
	}
}

function saveGoalToStorage(updated) {
	const saved = loadFromStorage()
	const idx = saved.goals.findIndex((g) => g.id === updated.id)
	if (idx !== -1) {
		saved.goals[idx] = updated
	} else {
		saved.goals.push(updated)
	}
	try {
		uni.setStorageSync(STORAGE_KEY, saved)
	} catch (e) { /* 存储失败不阻塞 */ }
}

let goalId = ''
onLoad((query) => {
	goalId = query && query.id ? decodeURIComponent(query.id) : ''
})

onShow(() => {
	isThoughtTheme.value = getAppMode() === 'thought'
	syncStatusBarTheme(isThoughtTheme.value ? 'thought' : 'image')
	syncRootTheme(isThoughtTheme.value ? 'thought' : 'image')

	const saved = loadFromStorage()
	startMonthText.value = saved.startMonth || '2026.08'
	endDate.value = saved.endDate || '2030-12-31'
	const foundRaw = saved.goals.find((g) => g.id === goalId)
	if (!foundRaw) {
		uni.showToast({ title: '目标不存在或已删除', icon: 'none' })
		setTimeout(() => goBack(), 600)
		return
	}
	goal.value = normalizeGoal(foundRaw)
})

function goBack() {
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
	} else {
		uni.reLaunch({ url: '/pages/goals/index' })
	}
}

/** 里程碑状态：done=已完成 / doing=进行中 / todo=未开始 */
function msStatus(m) {
	if ((m.done || 0) >= m.target) return 'done'
	if ((m.done || 0) > 0) return 'doing'
	return 'todo'
}

const percent = computed(() => {
	if (!goal.value || !goal.value.total) return 0
	return Math.max(0, Math.min(100, Math.round((goal.value.current / goal.value.total) * 100)))
})

const ringBg = computed(() => {
	const p = displayPercent.value.toFixed(2)
	const color = goal.value ? goal.value.color : 'var(--brand)'
	return `conic-gradient(${color} 0% ${p}%, rgba(137, 148, 169, 0.22) ${p}% 100%)`
})

/* ==================== 进度动效 ==================== */

/**
 * 圆环是 conic-gradient，CSS 过渡不了，所以用 rAF 把百分比补间出来。
 * 补间值保持小数：取整的话每帧只能跳 1%（=3.6°），缓动尾段就变成肉眼可见的一格一格。
 */
const displayPercent = ref(0)
const pctText = computed(() => Math.round(displayPercent.value))
const ringPop = ref(false)
let tweenRaf = null
let popTimer = null
let landTimer = null

function hexParts(hex) {
	const s = (hex || '').replace('#', '')
	return /^[0-9a-fA-F]{6}$/.test(s) ? s : null
}

/** 目标色提亮一档，做进度条渐变的高光端 */
function lighten(hex, t) {
	const s = hexParts(hex)
	if (!s) return hex
	const n = parseInt(s, 16)
	const f = (v) => Math.round(v + (255 - v) * t)
	return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`
}

function rgbaOf(hex, a) {
	const s = hexParts(hex)
	if (!s) return 'transparent'
	const n = parseInt(s, 16)
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/* 样式绑成对象而不是字符串：字符串走 cssText 整条重写，
   补间期间每帧都会重铺一次渐变和光晕，进度条就是在这里开始卡的 */
const barStyle = computed(() => {
	const c = goal.value ? goal.value.color : 'var(--brand)'
	return {
		width: displayPercent.value.toFixed(2) + '%',
		'background-image': `linear-gradient(90deg, ${c} 0%, ${lighten(c, 0.4)} 100%)`,
		'box-shadow': `0 0 14rpx ${rgbaOf(c, 0.3)}`
	}
})

function tweenPercent(to) {
	const from = displayPercent.value
	if (from === to) return
	if (to > from) {
		ringPop.value = true
		clearTimeout(popTimer)
		popTimer = setTimeout(() => { ringPop.value = false }, 640)
	}
	if (typeof requestAnimationFrame !== 'function') {
		displayPercent.value = to
		return
	}
	cancelAnimationFrame(tweenRaf)
	const start = Date.now()
	const dur = 900
	const step = () => {
		const k = Math.min(1, (Date.now() - start) / dur)
		displayPercent.value = from + (to - from) * (1 - Math.pow(1 - k, 3))
		if (k < 1) tweenRaf = requestAnimationFrame(step)
	}
	tweenRaf = requestAnimationFrame(step)
	// 页面被挂起时 rAF 一帧都不跑，兜底把值落到位，别让圆环停在 0%
	clearTimeout(landTimer)
	landTimer = setTimeout(() => { displayPercent.value = to }, dur + 120)
}

watch(percent, (v) => tweenPercent(v))

onUnmounted(() => {
	cancelAnimationFrame(tweenRaf)
	clearTimeout(popTimer)
	clearTimeout(landTimer)
})

const cheerText = computed(() => {
	if (!goal.value) return ''
	const remain = Math.round((goal.value.total - goal.value.current) * 10) / 10
	return remain > 0 ? `还差 ${fmtProgress(remain)} ${goal.value.unit}，继续加油！` : '目标已全部完成，太棒了！'
})

const recordsShown = computed(() => {
	if (!goal.value) return []
	return recordsExpanded.value ? goal.value.records : goal.value.records.slice(0, 3)
})

/* ==================== 更多操作：编辑 / 归档 / 删除 ==================== */

function onMore() {
	uni.showActionSheet({
		itemList: ['编辑目标', '归档目标', '删除目标'],
		success: (res) => {
			if (res.tapIndex === 0) openEditSheet()
			if (res.tapIndex === 1) archiveGoal()
			if (res.tapIndex === 2) deleteGoal()
		}
	})
}

function archiveGoal() {
	goal.value.status = 'archived'
	saveGoalToStorage(goal.value)
	uni.showToast({ title: '已归档（数据保留在本机）', icon: 'none' })
	setTimeout(() => goBack(), 600)
}

function deleteGoal() {
	uni.showModal({
		title: '删除目标',
		content: '删除后该目标及其记录无法恢复，确定删除吗？',
		confirmText: '删除',
		confirmColor: '#FF5F6D',
		success: (res) => {
			if (!res.confirm) return
			const saved = loadFromStorage()
			saved.goals = saved.goals.filter((g) => g.id !== goal.value.id)
			try {
				uni.setStorageSync(STORAGE_KEY, saved)
			} catch (e) { /* 忽略 */ }
			uni.showToast({ title: '已删除', icon: 'none' })
			setTimeout(() => goBack(), 600)
		}
	})
}

/* ==================== 编辑目标 ==================== */

function openEditSheet() {
	editTitle.value = goal.value.title
	editDesc.value = goal.value.desc
	editTotal.value = goal.value.total
	editUnit.value = goal.value.unit || ''
	editVisible.value = true
}

// 输入框里可能停着空串或非数字，步进阶与保存都先按数字兜底
function editTotalNum() {
	const n = parseInt(editTotal.value, 10)
	return Number.isNaN(n) ? 1 : n
}

function onEditTotalInput(e) {
	// 原样收下，让用户能清空重打；失焦或保存时才收进 1~999
	editTotal.value = e.detail.value
}

function clampEditTotal() {
	editTotal.value = Math.max(1, Math.min(999, editTotalNum()))
}

function stepEditTotal(delta) {
	editTotal.value = Math.max(1, Math.min(999, editTotalNum() + delta))
}

function saveEdit() {
	const title = (editTitle.value || '').trim()
	if (!title) {
		uni.showToast({ title: '目标名称不能为空', icon: 'none' })
		return
	}
	goal.value.title = title
	goal.value.desc = (editDesc.value || '').trim() || '持续推进中'
	goal.value.total = Math.max(1, Math.min(999, editTotalNum()))
	// 按量累计型可改单位；进度按类型由打卡数据立即重算
	if (goal.value.type === 'amount') goal.value.unit = (editUnit.value || '').trim()
	recomputeCurrent()
	saveGoalToStorage(goal.value)
	editVisible.value = false
	uni.showToast({ title: '已保存', icon: 'success' })
}

/* ==================== 添加记录 ==================== */

function openRecordSheet() {
	recordText.value = ''
	recordMsIndex.value = -1
	recordVisible.value = true
}

function dateKey(d) {
	return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

function todayText() {
	return dateKey(new Date())
}

function saveRecord() {
	const text = (recordText.value || '').trim()
	if (!text) {
		uni.showToast({ title: '先写点记录内容', icon: 'none' })
		return
	}
	let tag = '记录'
	// 关联里程碑：完成一次里程碑 +1（里程碑只在卡片内点亮；
	// 目标总进度统一由每日打卡天数驱动，记录不再直接加进度）
	if (recordMsIndex.value >= 0 && goal.value.milestones[recordMsIndex.value]) {
		const m = goal.value.milestones[recordMsIndex.value]
		if ((m.done || 0) < m.target) {
			m.done = (m.done || 0) + 1
			tag = m.done >= m.target ? '里程碑' : '进行中'
		}
	}
	goal.value.records.unshift({ date: todayText(), text, tag })
	saveGoalToStorage(goal.value)
	recordVisible.value = false
	uni.showToast({ title: '已记录', icon: 'success' })
}

/* ==================== 每日打卡 ==================== */
// 打卡独立于目标进度（current/total 由里程碑与记录推进），只记习惯连续性：
// 每天最多一次；打卡同时在目标记录里留一条 tag「打卡」，时间线可见

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 最近 7 天打卡情况（末位 = 今天） */
const recentDays = computed(() => {
	if (!goal.value) return []
	const set = new Set(goal.value.checkins)
	const days = []
	for (let i = 6; i >= 0; i--) {
		const d = new Date()
		d.setDate(d.getDate() - i)
		const key = dateKey(d)
		days.push({ date: key, label: i === 0 ? '今' : WEEKDAY_LABELS[d.getDay()], on: set.has(key), today: i === 0 })
	}
	return days
})

const checkedToday = computed(() => {
	const last = recentDays.value[recentDays.value.length - 1]
	return last ? last.on : false
})

/** 按天坚持型？amount 型的打卡是“记一笔完成量”，一天可多次 */
const isDaysType = computed(() => (goal.value ? goal.value.type !== 'amount' : true))

const checkinBtnText = computed(() => {
	if (!goal.value) return '今日打卡'
	if (!isDaysType.value) return checkedToday.value ? '再记一笔' : '今日打卡'
	return checkedToday.value ? '今日已打卡' : '今日打卡'
})

function onCheckinTap() {
	if (!goal.value) return
	if (!isDaysType.value) {
		amountInput.value = ''
		amountVisible.value = true
		return
	}
	onCheckin()
}

/** 连续打卡天数：今天已打则从今天起算，否则从昨天起算（不因今天还没打而清零） */
const streakDays = computed(() => {
	if (!goal.value) return 0
	const set = new Set(goal.value.checkins)
	const d = new Date()
	if (!set.has(dateKey(d))) d.setDate(d.getDate() - 1)
	let n = 0
	while (set.has(dateKey(d))) {
		n += 1
		d.setDate(d.getDate() - 1)
	}
	return n
})

const checkinSummary = computed(() => {
	if (!goal.value) return ''
	const total = goal.value.checkins.length
	return streakDays.value > 1 ? `累计 ${total} 天 · 连续 ${streakDays.value} 天` : `累计 ${total} 天`
})

/** 今日打卡（按天坚持型）：写 checkins 并同步进度（= 打卡天数封顶总目标），一天一次幂等 */
function onCheckin() {
	if (!goal.value || checkedToday.value) return
	const today = todayText()
	goal.value.checkins.unshift(today)
	recomputeCurrent()
	goal.value.records.unshift({ date: today, text: '每日打卡', tag: '打卡' })
	saveGoalToStorage(goal.value)
	uni.showToast({ title: '打卡成功', icon: 'success' })
}

/* ==================== 数值打卡（按量累计型） ==================== */

const amountVisible = ref(false)
const amountInput = ref('')

/** 记一笔完成量（如读完 1 本书 / 存了 3000 元），首次记入当天点亮打卡日历 */
function saveAmount() {
	if (!goal.value) return
	const v = parseFloat(amountInput.value)
	if (isNaN(v) || v <= 0) {
		uni.showToast({ title: '填一个大于 0 的数', icon: 'none' })
		return
	}
	const today = todayText()
	goal.value.amounts.push({ date: today, value: Math.round(v * 10) / 10 })
	if (!checkedToday.value) goal.value.checkins.unshift(today)
	recomputeCurrent()
	goal.value.records.unshift({ date: today, text: `打卡 +${fmtProgress(v)}${goal.value.unit ? ' ' + goal.value.unit : ''}`, tag: '打卡' })
	saveGoalToStorage(goal.value)
	amountVisible.value = false
	uni.showToast({ title: '打卡成功', icon: 'success' })
}
</script>

<style scoped>
	.detail-page {
		padding-bottom: 0;
	}

	/* ===== ① 顶部导航 ===== */
	.nav {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 8rpx 20rpx;
	}

	.nav-side {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: var(--btn-ghost-bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-title {
		font-size: 32rpx;
		font-weight: 600;
		color: var(--text);
	}

	/* ===== ② 目标概览卡 ===== */
	.overview-card {
		background: var(--overview-bg);
		border: 1rpx solid var(--overview-border);
		border-radius: var(--radius-xl);
		padding: 32rpx;
		margin-bottom: 24rpx;
	}

	.ov-main {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
	}

	.ov-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ov-info {
		flex: 1;
		margin-left: 22rpx;
		min-width: 0;
	}

	.ov-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.ov-name {
		font-size: 34rpx;
		font-weight: 700;
		color: var(--text);
	}

	.ov-tag {
		font-size: 20rpx;
		line-height: 1;
		padding: 6rpx 14rpx;
		border-radius: 999rpx;
		margin-left: 14rpx;
		flex-shrink: 0;
	}

	.ov-desc {
		display: block;
		font-size: 24rpx;
		color: var(--text-secondary);
		margin-top: 10rpx;
		line-height: 1.5;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		word-break: break-all;
	}

	.ov-foot {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-top: 24rpx;
	}

	.ov-foot-left {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.ov-foot-text {
		font-size: 22rpx;
		color: var(--text-secondary);
		margin-left: 8rpx;
	}

	.ov-chip {
		display: flex;
		flex-direction: row;
		align-items: center;
		background: var(--btn-ghost-bg);
		border-radius: 999rpx;
		padding: 8rpx 18rpx;
	}

	.ov-chip-text {
		font-size: 20rpx;
		color: var(--text-aux);
		margin-left: 6rpx;
	}

	/* ===== ③ 总体进度卡 ===== */
	.progress-card {
		padding: 32rpx 28rpx;
		margin-bottom: 24rpx;
	}

	.progress-top {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.ring {
		width: 156rpx;
		height: 156rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* 打卡后圆环弹一下（回弹曲线），配合百分比补间 */
	.ring--pop {
		animation: ring-pop 0.64s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes ring-pop {
		0% { transform: scale(1); }
		38% { transform: scale(1.07); }
		100% { transform: scale(1); }
	}

	.ring-hole {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		background: var(--overview-hole);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.ring-pct {
		font-size: 34rpx;
		font-weight: 700;
		color: var(--text);
		line-height: 1.1;
	}

	.ring-label {
		font-size: 18rpx;
		color: var(--text-aux);
	}

	.progress-nums {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-left: 32rpx;
	}

	.num-col {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.num-label {
		font-size: 22rpx;
		color: var(--text-aux);
	}

	.num-row {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		margin-top: 10rpx;
	}

	.num-big {
		font-size: 44rpx;
		font-weight: 700;
		color: var(--text);
	}

	.num-unit {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 6rpx;
	}

	.num-divider {
		width: 1rpx;
		height: 64rpx;
		background: var(--divider);
		margin: 0 20rpx;
	}

	.progress-bar-track {
		height: 14rpx;
		border-radius: 999rpx;
		background: rgba(137, 148, 169, 0.2);
		overflow: hidden;
		margin-top: 28rpx;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 999rpx;
	}

	.progress-cheer {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 16rpx;
	}

	.cheer-text {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 8rpx;
	}

	/* ===== 卡片头部通用行 ===== */
	.card-head-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid var(--divider);
	}

	.card-head-left {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.card-head-title {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--text);
		margin-left: 10rpx;
	}

	.card-head-extra {
		font-size: 22rpx;
		color: var(--text-aux);
	}

	/* ===== ④ 每日打卡 ===== */
	.checkin-card {
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.checkin-week {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-top: 26rpx;
		padding: 0 6rpx;
	}

	.checkin-day {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.checkin-day-label {
		font-size: 20rpx;
		color: var(--text-weak);
	}

	.checkin-day-label--today {
		color: var(--goal-accent, var(--brand));
		font-weight: 600;
	}

	.checkin-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: rgba(137, 148, 169, 0.25);
		margin-top: 14rpx;
	}

	/* 点亮当天：从小弹到原尺寸，颜色同时过渡 */
	.checkin-dot--on {
		background: var(--goal-accent, var(--brand));
		animation: dot-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes dot-pop {
		0% { transform: scale(0.4); }
		60% { transform: scale(1.3); }
		100% { transform: scale(1); }
	}

	@media (prefers-reduced-motion: reduce) {
		.ring--pop,
		.checkin-dot--on {
			animation: none;
		}
	}

	.checkin-dot--today {
		box-shadow: 0 0 0 5rpx var(--brand-light);
	}

	.checkin-btn {
		margin-top: 28rpx;
	}

	.checkin-btn--go {
		background: var(--goal-accent, var(--brand));
		color: #FFFFFF;
	}

	.checkin-btn--go:active {
		opacity: 0.85;
	}

	.checkin-btn--done {
		background: transparent;
		border: 1rpx solid var(--goal-accent, var(--brand));
		color: var(--goal-accent, var(--brand));
	}

	.checkin-btn-text {
		margin-left: 8rpx;
	}

	/* ===== ⑤ 里程碑计划 ===== */
	.ms-card {
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.ms-empty {
		padding: 32rpx 0 12rpx;
	}

	.ms-empty-text {
		font-size: 24rpx;
		color: var(--text-aux);
	}

	.ms-list {
		padding-top: 24rpx;
	}

	.ms-item {
		display: flex;
		flex-direction: row;
	}

	.ms-dot-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
		width: 44rpx;
	}

	.ms-dot {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ms-dot--done {
		background: var(--goal-accent, var(--brand));
	}

	.ms-dot--doing {
		background: transparent;
		border: 4rpx solid var(--goal-accent, var(--brand));
		box-sizing: border-box;
	}

	.ms-dot--todo {
		background: transparent;
		border: 2rpx solid var(--text-weak);
		box-sizing: border-box;
	}

	.ms-line {
		width: 2rpx;
		flex: 1;
		background: var(--divider);
		margin: 6rpx 0;
		min-height: 28rpx;
	}

	.ms-body {
		flex: 1;
		margin-left: 16rpx;
		padding-bottom: 26rpx;
		min-width: 0;
	}

	.ms-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.ms-name {
		font-size: 26rpx;
		font-weight: 600;
		color: var(--text);
	}

	.ms-nums {
		font-size: 22rpx;
		color: var(--text-secondary);
		margin-left: 16rpx;
		flex-shrink: 0;
	}

	.ms-desc {
		display: block;
		font-size: 22rpx;
		color: var(--text-aux);
		margin-top: 6rpx;
	}

	.ms-date {
		display: block;
		font-size: 20rpx;
		color: var(--text-weak);
		margin-top: 6rpx;
	}

	/* ===== ⑥ 目标记录 ===== */
	.record-card {
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.record-add {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.record-add-text {
		font-size: 22rpx;
		color: var(--brand);
		margin-left: 4rpx;
	}

	.record-empty {
		padding: 28rpx 0 8rpx;
	}

	.record-empty-text {
		font-size: 24rpx;
		color: var(--text-aux);
	}

	.record-list {
		padding-top: 24rpx;
	}

	.record-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 12rpx 0;
	}

	.record-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: var(--goal-accent, var(--brand));
		flex-shrink: 0;
	}

	.record-date {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 16rpx;
		flex-shrink: 0;
	}

	.record-text {
		flex: 1;
		font-size: 24rpx;
		color: var(--text);
		margin-left: 18rpx;
		margin-right: 12rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.record-tag {
		font-size: 20rpx;
		color: var(--text-aux);
		background: var(--btn-ghost-bg);
		border-radius: 999rpx;
		padding: 6rpx 14rpx;
		flex-shrink: 0;
	}

	.record-expand {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		padding: 18rpx 0 4rpx;
	}

	.record-expand-text {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-right: 6rpx;
	}

	/* ===== ⑦ 底部主操作 ===== */
	.actions {
		display: flex;
		flex-direction: row;
		padding: 8rpx 0 20rpx;
	}

	.action-edit {
		margin-left: 20rpx;
	}

	.safe-bottom {
		height: calc(env(safe-area-inset-bottom) + 20rpx);
	}

	/* ===== 弹层（与全局同款） ===== */
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
		padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
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

	.form-field {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		margin-top: 12rpx;
	}

	.form-input {
		flex: 1;
		height: 60rpx;
		font-size: 28rpx;
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0 20rpx;
	}

	.form-stepper {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		background: var(--btn-ghost-bg);
		border-radius: var(--radius-md);
		margin-top: 12rpx;
		padding: 10rpx 16rpx;
	}

	.step-btn {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: var(--overview-hole);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.step-num {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text);
	}

	/* 总目标值改成可输入：固定宽度居中，去掉输入框自带的底和框 */
	.step-input {
		width: 120rpx;
		text-align: center;
		background: transparent;
		border: none;
		padding: 0;
	}

	.start-btn {
		margin-top: 32rpx;
	}

	/* ===== 里程碑关联选择 ===== */
	.ms-pick-row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 12rpx;
	}

	.ms-pick {
		padding: 10rpx 18rpx;
		border-radius: 999rpx;
		background: var(--btn-ghost-bg);
		border: 1rpx solid transparent;
	}

	.ms-pick.active {
		background: var(--brand);
	}

	.ms-pick--done {
		opacity: 0.45;
	}

	.ms-pick-text {
		font-size: 22rpx;
		color: var(--text);
	}

	.ms-pick.active .ms-pick-text {
		color: var(--on-brand);
	}
</style>
