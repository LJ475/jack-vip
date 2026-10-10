/**
 * 「365天思考实验」的本机笔记存储。
 * 日历页的卡片和整屏本子页共用这一份数据（`thoughtNotes`，按日期存一条），
 * 所以读写和连续天数的算法放在这里，避免两边各写一套把格式写漂。
 */
const STORAGE_KEY = 'thoughtNotes'

/** 单条笔记上限：本子页面按行写，500 字大约十行出头 */
export const NOTE_MAX_LEN = 500

function pad(n) {
	return String(n).padStart(2, '0')
}

export function dateKey(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function loadNotes() {
	try {
		const n = uni.getStorageSync(STORAGE_KEY)
		return (n && typeof n === 'object' && !Array.isArray(n)) ? n : {}
	} catch (e) {
		return {}
	}
}

/** 取某天的记录；没写过返回 null */
export function getNote(date) {
	const rec = loadNotes()[date]
	if (!rec || !rec.text || !String(rec.text).trim()) return null
	return rec
}

/** 写入某天；text 去掉首尾空白后为空则删掉这条（保持「没记录」的语义） */
export function saveNote(date, text) {
	const notes = loadNotes()
	const trimmed = (text || '').trim()
	const t = new Date()
	const updatedAt = `${dateKey(t)} ${pad(t.getHours())}:${pad(t.getMinutes())}`
	if (trimmed) {
		notes[date] = { text: trimmed, updatedAt }
	} else {
		delete notes[date]
	}
	uni.setStorageSync(STORAGE_KEY, notes)
	return { text: trimmed, updatedAt: trimmed ? updatedAt : '' }
}

function hasNote(notes, d) {
	const rec = notes[dateKey(d)]
	return !!(rec && rec.text && String(rec.text).trim())
}

/** 连续记录天数：从今天往前数；今天还没记不打断连续（从昨天起算） */
export function calcStreak(notes = loadNotes()) {
	const t = new Date()
	if (!hasNote(notes, t)) t.setDate(t.getDate() - 1)
	let count = 0
	while (hasNote(notes, t) && count < 3660) {
		count++
		t.setDate(t.getDate() - 1)
	}
	return count
}
