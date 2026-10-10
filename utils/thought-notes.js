/**
 * 「365天思考实验」的本机笔记存储。
 * 日历页的卡片和整屏本子页共用这一份数据，所以读写与连续天数的算法都在这里。
 *
 * 结构：{ 'YYYY-MM-DD': [ { id, text, updatedAt }, ... ] } —— **一天可以写多篇**。
 * 旧版本是一天一条 { text, updatedAt }，读取时按天就地迁移成数组并落盘，内容一字不动。
 */
const STORAGE_KEY = 'thoughtNotes'

/** 单篇上限：本子页面按行写，500 字大约十行出头 */
export const NOTE_MAX_LEN = 500

function pad(n) {
	return String(n).padStart(2, '0')
}

export function dateKey(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function newId() {
	return `n${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function nowStamp() {
	const t = new Date()
	return `${dateKey(t)} ${pad(t.getHours())}:${pad(t.getMinutes())}`
}

/** 单篇的规范化：老格式（只有 text/updatedAt 的裸记录）补个 id 就行 */
function normalizeOne(raw) {
	if (typeof raw === 'string') {
		return raw.trim() ? { id: newId(), text: raw.trim(), updatedAt: '' } : null
	}
	if (!raw || typeof raw !== 'object') return null
	const text = String(raw.text == null ? '' : raw.text).trim()
	if (!text) return null
	return {
		id: raw.id || newId(),
		text,
		updatedAt: raw.updatedAt || ''
	}
}

/** 把一天的原始值统一成数组：数组 / 老的单条对象 / 字符串（更早的手滑写法）都能吃 */
function normalizeDay(raw) {
	if (Array.isArray(raw)) return raw.map(normalizeOne).filter(Boolean)
	const one = normalizeOne(raw)
	return one ? [one] : []
}

/** 读全量并按需迁移；返回 { notes, migrated } */
function readAll() {
	let raw = {}
	try {
		const v = uni.getStorageSync(STORAGE_KEY)
		if (v && typeof v === 'object' && !Array.isArray(v)) raw = v
	} catch (e) {
		return { notes: {}, migrated: false }
	}
	const notes = {}
	let migrated = false
	Object.keys(raw).forEach((date) => {
		const list = normalizeDay(raw[date])
		if (!Array.isArray(raw[date])) migrated = true
		else if (list.length !== raw[date].length) migrated = true
		notes[date] = list
	})
	return { notes, migrated }
}

function writeAll(notes) {
	uni.setStorageSync(STORAGE_KEY, notes)
}

/** 某天的全部文章，按写入先后 */
export function getNotes(date) {
	const { notes, migrated } = readAll()
	if (migrated) writeAll(notes)
	return notes[date] || []
}

export function getNoteById(date, id) {
	return getNotes(date).find((n) => n.id === id) || null
}

/** 新增一篇，返回新记录 */
export function addNote(date, text) {
	const trimmed = (text || '').trim()
	if (!trimmed) return null
	const { notes, migrated } = readAll()
	const one = { id: newId(), text: trimmed, updatedAt: nowStamp() }
	notes[date] = (notes[date] || []).concat(one)
	writeAll(notes)
	return one
}

/** 改一篇；text 清空等于删掉这篇。返回 { removed } 或更新后的记录 */
export function updateNote(date, id, text) {
	const trimmed = (text || '').trim()
	const { notes } = readAll()
	const list = notes[date] || []
	const i = list.findIndex((n) => n.id === id)
	if (!trimmed) {
		if (i > -1) list.splice(i, 1)
		if (!list.length) delete notes[date]
		else notes[date] = list
		writeAll(notes)
		return { removed: true }
	}
	if (i === -1) return addNote(date, trimmed)
	list[i] = { ...list[i], text: trimmed, updatedAt: nowStamp() }
	notes[date] = list
	writeAll(notes)
	return list[i]
}

export function removeNote(date, id) {
	const { notes } = readAll()
	const list = (notes[date] || []).filter((n) => n.id !== id)
	if (list.length) notes[date] = list
	else delete notes[date]
	writeAll(notes)
}

/** 连续记录天数：从今天往前数；今天还没记不打断连续（从昨天起算）。
 *  一天写几篇只算一天。 */
export function calcStreak() {
	const { notes } = readAll()
	const has = (d) => {
		const list = notes[dateKey(d)]
		return !!(list && list.length)
	}
	const t = new Date()
	if (!has(t)) t.setDate(t.getDate() - 1)
	let count = 0
	while (has(t) && count < 3660) {
		count++
		t.setDate(t.getDate() - 1)
	}
	return count
}
