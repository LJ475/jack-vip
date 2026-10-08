/**
 * 每日更新提醒（本地通知）
 *
 * plus.push.createMessage 的 delay 是一次性倒计时，不支持按日重复；
 * 这里一次调度未来 7 天的本地通知，App 每次回前台时检查覆盖情况自动续期——
 * 只要 7 天内至少打开过一次 App，提醒就不会断。
 *
 * 开关与提醒时间的 UI 在「关于我」弹层里；通知点击后默认回到 App 首页（日历页）。
 */

const ENABLE_KEY = 'dailyReminderEnabled'
const TIME_KEY = 'dailyReminderTime'
const SCHED_KEY = 'dailyReminderSchedule'

/** 一次调度未来几天的通知（打开 App 续期，断档风险与重复通知风险的折中） */
const DAYS_AHEAD = 7
/** 已调度覆盖超过这个时长就不再重排，避免每次回前台都反复取消/重建通知 */
const MIN_COVER_MS = 36 * 60 * 60 * 1000

export const DEFAULT_REMINDER_TIME = '20:00'
export const REMINDER_TITLE = 'jack会员分享'
export const REMINDER_TEXT = '今天的分享已更新，快来看看吧！'

export function isReminderEnabled() {
	try {
		return uni.getStorageSync(ENABLE_KEY) === true
	} catch (e) {
		return false
	}
}

export function setReminderEnabled(on) {
	try {
		uni.setStorageSync(ENABLE_KEY, !!on)
	} catch (e) { /* 忽略 */ }
}

export function getReminderTime() {
	try {
		const t = uni.getStorageSync(TIME_KEY)
		return /^\d{2}:\d{2}$/.test(t) ? t : DEFAULT_REMINDER_TIME
	} catch (e) {
		return DEFAULT_REMINDER_TIME
	}
}

export function setReminderTime(time) {
	try {
		uni.setStorageSync(TIME_KEY, time)
	} catch (e) { /* 忽略 */ }
}

function loadSchedule() {
	try {
		const s = uni.getStorageSync(SCHED_KEY)
		if (s && typeof s === 'object' && Array.isArray(s.items)) return s
	} catch (e) { /* 忽略 */ }
	return { time: '', items: [] }
}

function saveSchedule(schedule) {
	try {
		uni.setStorageSync(SCHED_KEY, schedule)
	} catch (e) { /* 忽略 */ }
}

/** 撤销所有已调度的提醒通知（关掉开关时调用） */
export function cancelReminderMessages() {
	// #ifdef APP-PLUS
	const items = loadSchedule().items
	items.forEach((it) => {
		if (it && it.id) {
			try { plus.push.removeMessage(it.id) } catch (e) { /* 尽力而为 */ }
		}
	})
	// #endif
	saveSchedule({ time: '', items: [] })
}

/**
 * 按当前开关与时间调度每日提醒（App 回前台时调用，覆盖足够则跳过）
 * @param {boolean} [force] 开关/时间刚变化时强制重排
 */
export function scheduleDailyReminders(force = false) {
	// #ifdef APP-PLUS
	try {
		if (!isReminderEnabled()) {
			cancelReminderMessages()
			return
		}
		const time = getReminderTime()
		const current = loadSchedule()
		const covered = current.time === time &&
			current.items.some((it) => it && it.fireAt && it.fireAt - Date.now() > MIN_COVER_MS)
		if (!force && covered) return

		// 撤掉旧通知再重排（时间没变时旧的可保留，但重排逻辑简单优先）
		current.items.forEach((it) => {
			if (it && it.id) {
				try { plus.push.removeMessage(it.id) } catch (e) { /* 尽力而为 */ }
			}
		})

		const [h, m] = time.split(':').map(Number)
		const base = new Date()
		base.setHours(h, m, 0, 0)
		const items = []
		for (let i = 0; i < DAYS_AHEAD; i++) {
			const fireAt = base.getTime() + i * 86400000
			const delaySec = Math.round((fireAt - Date.now()) / 1000)
			if (delaySec < 10) continue
			let id = ''
			try {
				id = plus.push.createMessage(
					REMINDER_TEXT,
					JSON.stringify({ type: 'dailyReminder' }),
					{ title: REMINDER_TITLE, delay: delaySec, sound: 'system', cover: false }
				) || ''
			} catch (e) { /* 尽力而为 */ }
			if (id) items.push({ id, fireAt })
		}
		saveSchedule({ time, items })
	} catch (e) { /* 尽力而为 */ }
	// #endif
}
