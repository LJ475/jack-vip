<template>
	<view class="page page-tabbar" :class="{ 'theme-thought': isThoughtTheme }">

		<!-- 页面标题（Hero） -->
		<view class="hero">
			<image class="hero-logo" src="/static/logo.png" mode="aspectFill" />
			<view class="hero-text">
				<text class="hero-title">干正事</text>
				<text class="hero-sub">设置一个倒计时，然后去做<text class="brand-word">真正重要</text>的事情</text>
			</view>
		</view>

		<!-- 主要操作：新建倒计时（sheen：黑金主题下带周期扫光） -->
		<view class="create-entry glassmorphism sheen" @click="openCreate">
			<view class="create-icon">
				<uni-icons type="plus" size="26" color="var(--brand)" />
			</view>
			<view class="create-text">
				<text class="create-title">新建倒计时</text>
				<text class="create-sub">设置时间，然后开始行动</text>
			</view>
			<uni-icons type="right" size="16" color="var(--text-weak)" />
		</view>

		<!-- 我的倒计时 -->
		<view class="section-head">
			<text class="section-title">我的倒计时</text>
			<view class="section-right">
				<view class="tag tag-primary" v-if="timers.length">{{ timers.length }} 个</view>
				<view class="clear-btn" v-if="timers.length" @click="clearAll">
					<uni-icons type="trash" size="14" color="var(--text-aux)" />
					<text class="clear-text">一键清除</text>
				</view>
			</view>
		</view>

		<view class="state-card glassmorphism" v-if="ready && !timers.length">
			<view class="state-icon">
				<uni-icons type="notification" size="30" color="var(--text-aux)" />
			</view>
			<text class="state-text">还没有倒计时，点上方「新建倒计时」开始</text>
		</view>

		<!-- 首帧骨架：走真卡片同一个组件的 loading 形态，外壳与尺寸天然一致 -->
		<template v-if="!ready">
			<timer-card v-for="i in 2" :key="'timer-sk-' + i" loading />
		</template>

		<timer-card
			v-for="t in timers"
			:key="t.id"
			:timer="t"
			@open="openTimer(t)"
			@remove="removeTimer(t)"
			@start="startTimer(t)"
		/>

		<!-- 状态 / 完成 弹层（当前页面内） -->
		<view v-if="statusVisible && selectedTimer">
			<view class="sheet-mask" @click="closeStatus"></view>
			<view class="sheet">
				<view class="sheet-inner glassmorphism glass-sheet">
					<view class="vibrancy-effect"></view>
					<view class="sheet-head">
						<text class="sheet-title">{{ selectedTimer.title }}</text>
						<view class="sheet-close" @click="closeStatus">
							<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
						</view>
					</view>
					<scroll-view scroll-y class="sheet-body">
						<view class="status-wrap">
							<!-- 已完成：时间到了 -->
							<template v-if="selectedTimer.status === 'completed'">
								<view class="done-wrap">
									<uni-icons type="checkmarkempty" size="42" color="var(--success)" />
									<text class="done-title">时间到了</text>
									<text class="done-name">{{ selectedTimer.title }}</text>
									<button class="btn btn-primary full-btn done-btn" @click="closeStatus">关闭</button>
								</view>
							</template>

							<!-- 运行中 -->
							<template v-else>
								<timer-countdown class="remain-text" :timer="selectedTimer" />
								<text class="remain-meta">闹钟已设 · 进行中</text>
								<view class="remain-tip">
									到点后 App 会自动弹出并响铃/震动（系统级闹钟，杀掉应用也生效）；此数字仅为界面展示。
								</view>
								<view class="status-actions">
									<button class="btn btn-ghost flex-1" @click="stopTimer(selectedTimer)">停止</button>
									<button class="btn btn-danger-plain flex-1 status-del" @click="removeTimer(selectedTimer)">删除</button>
								</view>
							</template>
						</view>
					</scroll-view>
				</view>
			</view>
		</view>

		<!-- 后台响铃保障指引 -->
		<view class="tips-card glassmorphism">
			<view class="card-head">
				<text class="card-title">后台响铃保障</text>
				<view class="btn btn-plain btn-sm" @click="goSettings">去开启</view>
			</view>
			<view class="card-body tips-body">
				<view class="tips-item">
					<text class="tips-idx">1</text>
					<text class="tips-line">允许「自启动」与「后台运行」（各品牌手机在 设置 → 应用管理 里）</text>
				</view>
				<view class="tips-item">
					<text class="tips-idx">2</text>
					<text class="tips-line">电池策略选「不限制 / 无限制」，关闭省电优化</text>
				</view>
				<view class="tips-item">
					<text class="tips-idx">3</text>
					<text class="tips-line">最近任务里下拉本应用卡片「锁定」，避免一键清理被强杀</text>
				</view>
				<view class="tips-item">
					<text class="tips-idx">4</text>
					<text class="tips-line">允许通知权限（到点若 App 未能弹出，会发带铃声的闹钟通知）</text>
				</view>
			</view>
		</view>

		<!-- 新建倒计时弹层 -->
		<countdown-create-sheet
			:visible="createVisible"
			@close="createVisible = false"
			@confirm="onCreateConfirm"
		/>

		<!-- 闹钟响铃全屏层 -->
		<view v-if="ringing" class="ring-mask">
			<view class="ring-card glassmorphism">
				<view class="vibrancy-effect"></view>
				<view class="ring-body">
					<uni-icons type="notification-filled" size="44" color="var(--brand)" />
					<text class="ring-title">{{ ringing.title }}</text>
					<text class="ring-sub">时间到了</text>
					<button class="btn btn-primary btn-lg full-btn ring-stop" @click="stopRing">停止响铃</button>
				</view>
			</view>
		</view>

		<!-- 底部导航（干正事为第三项） -->
		<app-tab-bar :current="2" />
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme, hideNativeTabBar } from '@/utils/app-mode.js'
import {
	listTimers,
	saveTimers,
	createTimer,
	scheduleNativeAlarm,
	cancelNativeAlarm,
	clearPendingAlarm,
	checkPendingAlarm,
	scheduleAlarmPush,
	cancelAlarmPush,
	ensureNotifyPermission,
	openAppSettings,
	startSystemTimer,
	USE_SYSTEM_TIMER_APP,
	BACKUP_PUSH_DELAY,
	RINGTONE_SRC,
	TIMER_STATUS
} from '@/api/countdown.js'
import { nowTs, subscribeClock, unsubscribeClock } from '@/utils/ticker.js'

// 本页没有模式切换入口，主题跟随全局内容模式（日历页切换后经 storage 传过来）：
// 专属会员分享 = 蓝色主题，365天思考实验 = 黑色主题
const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

// 页面状态
const timers = ref([])
// 列表在 onMounted 里才从本地读，首帧为空：用它驱动骨架，避免先闪「还没有倒计时」空状态
const ready = ref(false)
const createVisible = ref(false)
const selectedTimer = ref(null)
const statusVisible = ref(false)
const ringing = ref(null)

function persist() {
	saveTimers(timers.value)
}

function openCreate() {
	createVisible.value = true
}

/** 创建后：保存本地任务并设置原生闹钟 */
function onCreateConfirm(payload) {
	const t = createTimer(payload)
	timers.value.unshift(t)
	persist()
	createVisible.value = false
	startTimer(t)
}

/** 启动：设系统级精确闹钟（到点唤醒 App 响铃震动）+ 备用闹钟通知 */
function startTimer(t) {
	const fireAt = Date.now() + t.durationSeconds * 1000
	const res = scheduleNativeAlarm({ title: t.title, fireAt })
	// 备用通道：+30 秒的闹钟通知；主通道正常响铃时会自动取消它
	t.backupMsgId = scheduleAlarmPush({
		title: t.title,
		delaySec: (fireAt + BACKUP_PUSH_DELAY * 1000 - Date.now()) / 1000
	})
	// 辅助通道（默认关闭）：同时调起系统时钟计时器
	if (USE_SYSTEM_TIMER_APP) {
		startSystemTimer({ title: t.title, durationSeconds: t.durationSeconds })
	}
	if (res.ok) {
		// 若该任务之前设过闹钟，先清掉旧记录
		clearPendingAlarm(t.id)
		t.alarmCode = res.code
		t.status = TIMER_STATUS.RUNNING
		t.startedAt = Date.now()
		t.completedAt = null
		addPending(t.id, t.title, fireAt, res.code)
		uni.showToast({ title: '闹钟已设，到点响铃提醒', icon: 'none' })
	} else {
		t.status = TIMER_STATUS.FAILED
		uni.showToast({ title: '启动失败：' + (res.error || '设置闹钟失败'), icon: 'none' })
	}
	persist()
}

function addPending(id, title, fireAt, code) {
	try {
		const list = uni.getStorageSync('pendingAlarms') || []
		const arr = Array.isArray(list) ? list.filter((x) => x.id !== id) : []
		arr.push({ id, title, fireAt, code })
		uni.setStorageSync('pendingAlarms', arr)
	} catch (e) { /* 忽略 */ }
}

function openTimer(t) {
	if (t.status === TIMER_STATUS.RUNNING || t.status === TIMER_STATUS.COMPLETED) {
		selectedTimer.value = t
		statusVisible.value = true
	}
}

function closeStatus() {
	statusVisible.value = false
}

/** 停止跟踪：取消原生闹钟与备用通知 */
function stopTimer(t) {
	cancelNativeAlarm(t.alarmCode)
	cancelAlarmPush(t.backupMsgId)
	t.backupMsgId = ''
	removePendingById(t.id)
	t.alarmCode = 0
	t.status = TIMER_STATUS.IDLE
	t.startedAt = null
	t.completedAt = null
	persist()
	closeStatus()
	uni.showToast({ title: '已停止跟踪', icon: 'none' })
}

function removeTimer(t) {
	cancelNativeAlarm(t.alarmCode)
	cancelAlarmPush(t.backupMsgId)
	removePendingById(t.id)
	timers.value = timers.value.filter((x) => x.id !== t.id)
	persist()
	closeStatus()
	uni.showToast({ title: '已删除', icon: 'none' })
}

function removePendingById(id) {
	try {
		const list = uni.getStorageSync('pendingAlarms') || []
		if (Array.isArray(list)) {
			uni.setStorageSync('pendingAlarms', list.filter((x) => x.id !== id))
		}
	} catch (e) { /* 忽略 */ }
}

function goSettings() {
	const ok = openAppSettings()
	if (!ok) {
		uni.showToast({ title: '请在系统设置中找到本应用', icon: 'none' })
	}
}

/** 一键清除全部倒计时记录（同时取消所有已设闹钟与备用通知） */
function clearAll() {
	if (!timers.value.length) return
	uni.showModal({
		title: '一键清除',
		content: '确定清除全部倒计时记录吗？进行中的闹钟也会一并取消。',
		confirmText: '清除',
		confirmColor: '#FF5F6D',
		success: (res) => {
			if (!res.confirm) return
			timers.value.forEach((t) => {
				cancelNativeAlarm(t.alarmCode)
				cancelAlarmPush(t.backupMsgId)
			})
			clearPendingAlarm()
			timers.value = []
			persist()
			uni.showToast({ title: '已全部清除', icon: 'none' })
		}
	})
}

function remainingOf(t) {
	return (t.startedAt || 0) + t.durationSeconds * 1000 - nowTs.value
}

/* ==================== 响铃（循环铃声 + 循环震动） ==================== */

let audioCtx = null
let vibrateTimer = null

function startRing(title) {
	if (ringing.value) return
	statusVisible.value = false
	ringing.value = { title }
	// #ifdef APP-PLUS
	try { plus.device.vibrate(900) } catch (e) { /* 忽略 */ }
	vibrateTimer = setInterval(() => {
		try { plus.device.vibrate(900) } catch (e) { /* 忽略 */ }
	}, 1300)
	// #endif
	audioCtx = uni.createInnerAudioContext()
	audioCtx.src = RINGTONE_SRC
	audioCtx.loop = true
	audioCtx.volume = 1
	audioCtx.play()
}

function stopRing() {
	if (audioCtx) {
		try { audioCtx.stop(); audioCtx.destroy() } catch (e) { /* 忽略 */ }
		audioCtx = null
	}
	if (vibrateTimer) {
		clearInterval(vibrateTimer)
		vibrateTimer = null
	}
	ringing.value = null
}

/** 到期统一入口：取消备用通知 + 清记录 + 响铃 */
function handleAlarmDue(pending) {
	// 正在响铃时不动记录直接返回：响铃结束后下一秒轮询会接着处理这条，
	// 避免第二个到点的闹钟被清掉记录后永远不响
	if (ringing.value) return
	clearPendingAlarm(pending.id)
	removePendingById(pending.id)
	// 主通道已成功响铃，取消备用通知，避免双重提醒
	const t = timers.value.find((x) => x.id === pending.id)
	if (t && t.backupMsgId) {
		cancelAlarmPush(t.backupMsgId)
		t.backupMsgId = ''
	}
	startRing(pending.title)
}

// 秒级刷新仅用于界面展示与状态落库；真正计时/提醒由系统闹钟负责
let uiTimer = null

onMounted(() => {
	ensureNotifyPermission()
	timers.value = listTimers()
	ready.value = true
})

// 从其它页面/后台回到本页：检查是否有到点闹钟（闹钟会把 App 拉到前台）
onShow(() => {
	const due = checkPendingAlarm()
	if (due) handleAlarmDue(due)
	hideNativeTabBar()
	// 主题跟随全局模式 + 状态栏文字颜色同步
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	subscribeClock()
	// tab 页切走不再销毁，秒级轮询跟着显示/隐藏启停：
	// 停在后台还在轮询闹钟，会在别的页面上抢着响铃、抢着落库
	if (!uiTimer) uiTimer = setInterval(() => {
		// 有到期的原生闹钟 → 响铃
		const due = checkPendingAlarm()
		if (due) handleAlarmDue(due)

		// 状态落库：运行中且已到期 → 已完成
		let changed = false
		let newly = null
		timers.value.forEach((t) => {
			if (t.status === TIMER_STATUS.RUNNING && remainingOf(t) <= 0) {
				t.status = TIMER_STATUS.COMPLETED
				t.completedAt = (t.startedAt || 0) + t.durationSeconds * 1000
				changed = true
				newly = t
			}
		})
		if (changed) {
			persist()
			if (newly && !ringing.value && !checkPendingAlarm()) {
				selectedTimer.value = newly
				statusVisible.value = true
			}
		}
	}, 1000)
})

onHide(() => {
	unsubscribeClock()
	if (uiTimer) {
		clearInterval(uiTimer)
		uiTimer = null
	}
})

onUnmounted(() => {
	if (uiTimer) clearInterval(uiTimer)
	stopRing()
})
</script>

<style scoped>
	/* ===== Hero（与日历页同款头部模式） ===== */
	.hero {
		background: var(--hero-bg);
		border: 1rpx solid var(--hero-border);
		border-radius: var(--radius-xl);
		padding: 44rpx 32rpx;
		margin-bottom: 28rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.hero-logo {
		width: 112rpx;
		height: 112rpx;
		border-radius: 28rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 8rpx 24rpx var(--brand-glow-soft);
		flex-shrink: 0;
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		margin-left: 24rpx;
	}

	.hero-title {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 2rpx;
	}

	.hero-sub {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-top: 10rpx;
		line-height: 1.5;
	}

	.brand-word {
		color: var(--brand);
		font-weight: 700;
	}

	/* ===== 新建倒计时入口卡 ===== */
	.create-entry {
		display: flex;
		align-items: center;
		padding: 32rpx 28rpx;
		margin-bottom: 32rpx;
	}

	.create-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: var(--radius-md);
		background: var(--brand-light);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.create-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		margin-left: 24rpx;
	}

	.create-title {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.create-sub {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-top: 6rpx;
	}

	/* ===== 我的倒计时 ===== */
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 8rpx 24rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
		letter-spacing: 1rpx;
	}

	.section-right {
		display: flex;
		align-items: center;
	}

	.clear-btn {
		display: flex;
		align-items: center;
		margin-left: 16rpx;
		padding: 8rpx 0 8rpx 12rpx;
	}

	.clear-text {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-left: 6rpx;
	}

	.state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 72rpx 28rpx;
		/* 空态卡与下方指引卡之间留出和列表卡片一致的间距 */
		margin-bottom: 24rpx;
	}

	.state-icon {
		width: 96rpx;
		height: 96rpx;
		border-radius: 50%;
		background: var(--brand-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.state-text {
		font-size: 26rpx;
		color: var(--text-aux);
		margin-top: 24rpx;
	}

	/* ===== 状态 / 完成 弹层 ===== */
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

	.sheet-body {
		flex: 1;
		max-height: 60vh;
		position: relative;
		z-index: 1;
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

	.status-wrap {
		padding: 8rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
	}

	.remain-text {
		display: block;
		font-size: 72rpx;
		font-weight: 700;
		color: var(--brand);
		text-align: center;
	}

	.remain-meta {
		display: block;
		font-size: 24rpx;
		color: var(--text-aux);
		text-align: center;
		margin-top: 12rpx;
	}

	.remain-tip {
		font-size: 22rpx;
		color: var(--text-aux);
		line-height: 1.6;
		background: var(--brand-light);
		border-radius: var(--radius-sm);
		padding: 20rpx 24rpx;
		margin-top: 28rpx;
	}

	.status-actions {
		display: flex;
		margin-top: 32rpx;
	}

	.status-del {
		margin-left: 20rpx;
	}

	/* ===== 已完成展示 ===== */
	.done-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24rpx 0 8rpx;
	}

	.done-title {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text);
		margin-top: 20rpx;
	}

	.done-name {
		font-size: 26rpx;
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	.done-btn {
		margin-top: 32rpx;
	}

	/* ===== 后台响铃保障指引卡 ===== */
	.tips-card {
		margin-bottom: 20rpx;
	}

	.tips-body {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
		padding-top: 8rpx;
		padding-bottom: 12rpx;
	}

	.tips-item {
		display: flex;
		align-items: flex-start;
	}

	.tips-idx {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		background: var(--brand-light);
		color: var(--brand);
		font-size: 20rpx;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2rpx;
	}

	.tips-line {
		flex: 1;
		margin-left: 16rpx;
		font-size: 22rpx;
		color: var(--text-secondary);
		line-height: 1.65;
	}

	.card-head .btn {
		margin-left: 16rpx;
	}

	/* ===== 闹钟响铃全屏层 ===== */
	.ring-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
		z-index: 1500;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: sheet-mask-in 0.2s ease both;
	}

	.ring-card {
		width: 560rpx;
		border-radius: var(--radius-lg);
	}

	.ring-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 56rpx 40rpx 44rpx;
		position: relative;
		z-index: 1;
	}

	.ring-title {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
		margin-top: 24rpx;
		text-align: center;
	}

	.ring-sub {
		font-size: 26rpx;
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	.ring-stop {
		margin-top: 40rpx;
	}
</style>
