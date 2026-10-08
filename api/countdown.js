/**
 * 倒计时任务数据层 + 原生闹钟封装
 *
 * 提醒机制（真闹钟）：
 * 1. 用 AlarmManager.setAlarmClock 设精确闹钟（闹钟级，杀进程生效、免精确闹钟授权），
 *    到点由系统唤醒 App 到前台；
 * 2. App 检测到闹钟到期后循环播放铃声 + 循环震动（static/alarm.wav），
 *    全屏"时间到了"卡片，用户点「停止响铃」才结束。
 * 本地只保存任务记录与界面状态；页内秒级刷新仅用于 UI 展示。
 */

export const TIMER_STATUS = {
	IDLE: 'idle',           // 未启动
	RUNNING: 'running',     // 进行中
	COMPLETED: 'completed', // 已完成
	FAILED: 'failed'        // 启动失败
}

/** 是否同时调起系统时钟计时器（默认关，避免双重提醒；需要时改 true） */
export const USE_SYSTEM_TIMER_APP = false

/**
 * 闹铃音频路径：想固定成一段自己的音频，
 * 把音频文件放进 static/ 目录后改这里即可（支持 mp3 / wav / m4a）。
 * 会循环播放直到用户按「停止响铃」。
 */
export const RINGTONE_SRC = '/static/jack.mp3'

/** 备用通道延迟（秒）：主通道（拉起 App 响铃）被系统拦截时，推迟这么久发闹钟通知 */
export const BACKUP_PUSH_DELAY = 30

const STORAGE_KEY = 'workTimers'
const PENDING_KEY = 'pendingAlarms'

/* ==================== 本地任务记录 ==================== */

/** 读取本地任务列表，并把已到期的运行中任务刷新为已完成 */
export function listTimers() {
	try {
		const list = uni.getStorageSync(STORAGE_KEY) || []
		if (!Array.isArray(list)) return []
		const now = Date.now()
		let changed = false
		list.forEach((t) => {
			if (t && t.status === TIMER_STATUS.RUNNING) {
				const endAt = (t.startedAt || 0) + t.durationSeconds * 1000
				if (endAt <= now) {
					t.status = TIMER_STATUS.COMPLETED
					t.completedAt = endAt
					changed = true
				}
			}
		})
		if (changed) {
			try { uni.setStorageSync(STORAGE_KEY, list) } catch (e) { /* 忽略 */ }
		}
		return list
	} catch (e) {
		return []
	}
}

export function saveTimers(list) {
	try {
		uni.setStorageSync(STORAGE_KEY, list || [])
	} catch (e) { /* 存储失败不阻塞 */ }
}

/** 生成任务对象（未启动状态），由调用方保存 */
export function createTimer({ title, hour, minute, second, durationSeconds }) {
	return {
		id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		title,
		hour,
		minute,
		second,
		durationSeconds,
		status: TIMER_STATUS.IDLE,
		createdAt: Date.now(),
		startedAt: null,
		completedAt: null,
		alarmCode: 0,
		backupMsgId: ''
	}
}

/* ==================== 到期闹钟记录 ==================== */

export function getPendingAlarms() {
	try {
		const list = uni.getStorageSync(PENDING_KEY) || []
		return Array.isArray(list) ? list : []
	} catch (e) {
		return []
	}
}

function savePendingAlarms(list) {
	try {
		uni.setStorageSync(PENDING_KEY, list || [])
	} catch (e) { /* 忽略 */ }
}

/** 取一条已到期（到点时间已过）的闹钟记录；没有则返回 null */
export function checkPendingAlarm() {
	const now = Date.now()
	const due = getPendingAlarms().find((p) => p && p.fireAt && p.fireAt <= now + 800)
	return due || null
}

function addPendingAlarm(p) {
	const list = getPendingAlarms().filter((x) => x.id !== p.id)
	list.push(p)
	savePendingAlarms(list)
}

function removePendingAlarm(id) {
	savePendingAlarms(getPendingAlarms().filter((x) => x.id !== id))
}

export function clearPendingAlarm(id) {
	if (id) {
		removePendingAlarm(id)
	} else {
		savePendingAlarms([])
	}
}

/* ==================== Android 原生精确闹钟 ==================== */

function buildLaunchIntent(main) {
	plus.android.importClass(main)
	const pm = main.getPackageManager()
	plus.android.importClass(pm)
	const intent = pm.getLaunchIntentForPackage(main.getPackageName())
	if (!intent) return null
	plus.android.importClass(intent)
	return intent
}

/**
 * 补设锁屏亮屏 flag（App onShow 时调用）
 *
 * setShowWhenLocked/setTurnScreenOn 只对当前 Activity 实例生效：
 * 进程被杀后闹钟拉起 App 时系统重建的 Activity 不保留之前的设置，
 * 所以每次回前台都要重新设置一遍，锁屏到点才能亮屏。
 */
export function applyLockScreenFlags() {
	// #ifdef APP-PLUS
	try {
		const main = plus.android.runtimeMainActivity()
		const Build = plus.android.importClass('android.os.Build')
		if (Build.VERSION.SDK_INT >= 27) {
			main.setShowWhenLocked(true)
			main.setTurnScreenOn(true)
		} else {
			const win = main.getWindow()
			plus.android.importClass(win)
			// FLAG_SHOW_WHEN_LOCKED | FLAG_TURN_SCREEN_ON
			win.addFlags(0x00080000 | 0x00200000)
		}
	} catch (e) { /* 尽力而为 */ }
	// #endif
}

/**
 * 设置闹钟级精确闹钟：到点系统会拉起 App（即使进程已被杀）
 * setAlarmClock 不需要 SCHEDULE_EXACT_ALARM 授权，且状态栏显示闹钟图标
 * @returns {{ ok: boolean, error?: string, code?: number }}
 */
export function scheduleNativeAlarm({ title, fireAt }) {
	// #ifdef APP-PLUS
	try {
		const main = plus.android.runtimeMainActivity()
		const intent = buildLaunchIntent(main)
		if (!intent) return { ok: false, error: '无法获取应用入口' }
		// extras 不影响 PendingIntent 匹配
		intent.putExtra('fromWorkAlarm', true)

		const code = Number(String(Date.now()).slice(-9))
		const PendingIntent = plus.android.importClass('android.app.PendingIntent')
		// FLAG_IMMUTABLE(0x04000000) | FLAG_UPDATE_CURRENT(0x08000000)
		const pi = PendingIntent.getActivity(main, code, intent, 0x04000000 | 0x08000000)

		const AlarmManager = plus.android.importClass('android.app.AlarmManager')
		const am = main.getSystemService('alarm')
		plus.android.importClass(am)
		const AlarmClockInfo = plus.android.importClass('android.app.AlarmManager$AlarmClockInfo')
		const info = new AlarmClockInfo(fireAt, pi)
		am.setAlarmClock(info, pi)

		applyLockScreenFlags()

		return { ok: true, code }
	} catch (e) {
		return { ok: false, error: (e && e.message) || '设置闹钟失败' }
	}
	// #endif
	// #ifndef APP-PLUS
	return { ok: false, error: '仅 Android App 环境可用' }
	// #endif
}

/** 取消某个任务对应的原生闹钟（需与设置时同 code、同 Intent 才能取消） */
export function cancelNativeAlarm(code) {
	// #ifdef APP-PLUS
	if (!code) return
	try {
		const main = plus.android.runtimeMainActivity()
		const intent = buildLaunchIntent(main)
		if (!intent) return
		const PendingIntent = plus.android.importClass('android.app.PendingIntent')
		const pi = PendingIntent.getActivity(main, code, intent, 0x04000000 | 0x08000000)
		const am = main.getSystemService('alarm')
		plus.android.importClass(am)
		am.cancel(pi)
	} catch (e) { /* 尽力而为 */ }
	// #endif
}

/**
 * 调起 Android 系统计时器（辅助通道，默认关闭）
 * ACTION_SET_TIMER + EXTRA_LENGTH(秒) + EXTRA_MESSAGE(名称) + EXTRA_SKIP_UI(true)
 */
export function startSystemTimer({ title, durationSeconds }) {
	// #ifdef APP-PLUS
	try {
		const main = plus.android.runtimeMainActivity()
		const Intent = plus.android.importClass('android.content.Intent')
		const intent = new Intent('android.intent.action.SET_TIMER')
		intent.putExtra('android.intent.extra.LENGTH', durationSeconds)
		intent.putExtra('android.intent.extra.MESSAGE', String(title || '倒计时'))
		intent.putExtra('android.intent.extra.SKIP_UI', true)
		intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
		main.startActivity(intent)
		return { ok: true }
	} catch (e) {
		return { ok: false, error: (e && e.message) || '启动失败' }
	}
	// #endif
	// #ifndef APP-PLUS
	return { ok: false, error: '仅 Android App 环境可用' }
	// #endif
}

/* ==================== 备用通道：本地推送闹钟通知 ==================== */

/**
 * 调度一条本地推送作为备用提醒（到点通知，带系统提示音）
 * 主通道（拉起 App 循环响铃）一旦开始响铃，应立即调用 cancelAlarmPush 取消本条
 * @returns 消息 id（用于取消），失败返回空串
 */
export function scheduleAlarmPush({ title, delaySec }) {
	// #ifdef APP-PLUS
	try {
		const msgId = plus.push.createMessage(
			`「${title}」时间到了，去干正事！`,
			JSON.stringify({ type: 'workTimer' }),
			{
				title: `干正事 · ${title}`,
				delay: Math.max(1, Math.round(delaySec)),
				sound: 'system',
				cover: false
			}
		)
		return msgId || ''
	} catch (e) {
		return ''
	}
	// #endif
	// #ifndef APP-PLUS
	return ''
	// #endif
}

/** 尽力取消已调度的备用通知 */
export function cancelAlarmPush(msgId) {
	// #ifdef APP-PLUS
	try {
		if (msgId && typeof plus.push.removeMessage === 'function') {
			plus.push.removeMessage(msgId)
		}
	} catch (e) { /* 部分机型无法撤销已调度通知 */ }
	// #endif
}

/** Android 13+ 通知权限运行时申请（不授权则备用通知会被系统静默丢弃） */
export function ensureNotifyPermission() {
	// #ifdef APP-PLUS
	try {
		if (plus.os.name === 'Android' && parseInt(plus.os.version) >= 13) {
			plus.android.requestPermissions(
				['android.permission.POST_NOTIFICATIONS'],
				function () { /* 结果不阻塞流程 */ },
				function () { /* 申请失败不阻塞流程 */ }
			)
		}
	} catch (e) { /* 尽力而为 */ }
	// #endif
}

/** 跳转本应用的系统设置详情页（自启动 / 通知 / 电池等权限入口） */
export function openAppSettings() {
	// #ifdef APP-PLUS
	try {
		const main = plus.android.runtimeMainActivity()
		const Intent = plus.android.importClass('android.content.Intent')
		const Uri = plus.android.importClass('android.net.Uri')
		const intent = new Intent('android.settings.APPLICATION_DETAILS_SETTINGS')
		intent.setData(Uri.fromParts('package', main.getPackageName(), null))
		main.startActivity(intent)
		return true
	} catch (e) {
		return false
	}
	// #endif
	// #ifndef APP-PLUS
	return false
	// #endif
}
