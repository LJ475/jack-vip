import { request } from '../utils/request.js'

/**
 * 内容数据接口层（双模式：专属会员分享 / 365天思考实验）
 *
 * 数据源由 DATA_SOURCE 切换，三档：
 *   'cos'        腾讯云 COS 清单文件（正式方案，推荐）
 *   'cloudbase'  腾讯云 CloudBase daily_shares 表（备用方案）
 *   'mock'       本地模拟数据（开发/演示）
 *
 * —— COS 清单方案（正式） ——
 * 图片按 {日期}_{作品ID}_{序号}.jpg 传桶，但作品 ID 每天都不同，
 * App 没法从日期反推 URL，所以真正的关键是同目录下的清单文件
 * manifest-<随机段>.json（地址即密钥，见下方常量处注释）：键为日期、
 * 值为该日图片直链数组，App 拉一次清单就能同时拿到「哪些天有内容
 * （打点）」和「某天有哪些图」，全程不需要数据库和自建后端：
 *   {
 *     "2026-10-03": ["<图片直链>", ...],
 *     "2026-10-04": ["<图片直链>", ..., ...]
 *   }
 * 思考实验同理用 thought-manifest-<随机段>.json（还没传就当空内容，不报错）。
 * 清单 404（尚未上传）按「暂无内容」降级；其他错误抛给页面显示重试。
 *
 * —— CloudBase 方案 ——
 * 表 daily_shares 只有两列：image_url（图片公开直链）/ created_at（发布时间），
 * 归属哪天由 created_at 的日期部分推出（库里没有日期列，也没有 id）。
 * 与 contributors.js 同一套网关与钥匙，表权限只给 anon 开「读」。
 * 思考实验走这张表；专属会员分享仍走上面的 COS 清单（清单为空即无内容）。
 */
const DATA_SOURCE = 'cos'

/* ==================== 数据源一：COS 清单（正式） ====================
 * 【当前状态：旧桶（jackapp-1360607419 / img.xiaonbai.top）已 451 整桶封禁，
 *   指向旧桶的请求已全部摘除，清单地址置空 —— App 零外网请求、空数据运行。
 *   等新存储桶确定后把下面两个常量填回即可恢复，要点：
 *   - 清单文件名建议沿用随机段方案（地址即密钥），例如
 *     manifest-<随机段>.json / thought-manifest-<随机段>.json；
 *   - H5 与 APK 可用不同取数路径（H5 走同源或代理，APK 走绝对地址），
 *     旧实现可参考 git/下方注释；爬虫端 server.py 的 MANIFEST_FILENAME 同步改。】
 * 清单格式（键为日期、值为该日图片直链数组）：
 *   { "2026-10-03": ["<图片直链>", ...], "2026-10-04": ["<图片直链>", ...] }
 * 清单 404（尚未上传）按「暂无内容」降级；其他错误抛给页面显示重试。
 */

// TODO(新桶): 拿到新存储桶后在这里填回两个清单地址（H5 与 APK 可分别配置）
const COS_IMAGE_MANIFEST = ''
const COS_THOUGHT_MANIFEST = ''
// 清单内存缓存：10 分钟内的翻月/切模式不重复拉取
const MANIFEST_TTL = 10 * 60 * 1000

// { image: { at, promise } | null, thought: ... }；缓存 promise 自带在途去重
const manifestCache = { image: null, thought: null }

function manifestUrl(mode) {
	return mode === CONTENT_MODE.THOUGHT ? COS_THOUGHT_MANIFEST : COS_IMAGE_MANIFEST
}

function fetchManifest(mode) {
	// 清单地址未配置（换桶过渡期）：不发任何请求，按空内容处理
	const base = manifestUrl(mode)
	if (!base) return Promise.resolve({})
	// ?t= 时间戳绕过 CDN/浏览器缓存：当天传了新清单，App 端重进即可看到
	const url = `${base}?t=${Date.now()}`
	return request({ url }).then((data) => {
		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			throw new Error('清单格式不正确（应为 { "日期": ["直链", ...] } 对象）')
		}
		return data
	})
}

function getManifest(mode) {
	const key = mode === CONTENT_MODE.THOUGHT ? 'thought' : 'image'
	const now = Date.now()
	let entry = manifestCache[key]
	if (!entry || now - entry.at > MANIFEST_TTL) {
		entry = {
			at: now,
			promise: fetchManifest(mode).catch((e) => {
				// 失败清缓存，下次调用会重试；404 = 清单还没传，按空内容降级
				manifestCache[key] = null
				if (e && e.statusCode === 404) return {}
				throw e
			})
		}
		manifestCache[key] = entry
	}
	return entry.promise
}

/** 清单 -> 某天的内容列表（直链数组映射成统一结构） */
function sharesFromManifest(manifest, date, mode) {
	const urls = Array.isArray(manifest[date]) ? manifest[date] : []
	return urls.map((url, index) => ({
		id: `${date}-${index + 1}`,
		share_date: date,
		image_url: url,
		caption: '',
		source_name: 'Jack',
		created_at: '',
		mode
	}))
}

/** 清单 -> 某月有内容的日期集合（打点用） */
function datesFromManifest(manifest, month) {
	return Object.keys(manifest)
		.filter((date) => typeof date === 'string' && date.indexOf(month) === 0)
		.sort()
}

/* ==================== 数据源二：CloudBase（备用） ==================== */

const CLOUDBASE_ENV = 'jack-d8gkgnrc9cda47ee5'
const CLOUDBASE_BASE = `https://${CLOUDBASE_ENV}.api.tcloudbasegateway.com`
const CLOUDBASE_PUBLISHABLE_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjkzYzI4ZmNhLTFjZGUtNDViMC1hMzhiLTcwZDYxNGJmZjYxYyJ9.eyJpc3MiOiJodHRwczovL2phY2stZDhna2ducmM5Y2RhNDdlZTUuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6ImphY2stZDhna2ducmM5Y2RhNDdlZTUiLCJleHAiOjQwOTQyNjkzODgsImlhdCI6MTc5MDU4NjE4OCwibm9uY2UiOiJ1aUliOFBlWlFpLW5PZDBYMXZFZ0xBIiwiYXRfaGFzaCI6InVpSWI4UGVaUWktbk9kMFgxdkVnTEEiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoiamFjay1kOGdrZ25yYzljZGE0N2VlNSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.dBobdA4Fe66GtTFBQwTezU6Lnw_lXSH9-4sStCLucsqKsL530xPg8SzvEPqzTCpRbRCDrXapFWRW-S3noVVAuQKYpNMwumnxLLHci29Ucg5FE1GyNRwl980CpH1ZS5ke0qSz5LXhn1nyPGpdNXLfx2wE517rzs12128GufK5-O7_geJlePbVH79i3le4mDmrJhbSUgdUBZUwVFT5Ic7pRqAXGCqBGbnBrJIF_MFPoWzrC1MhHiQptOoT9vhNL0X5ZvMiA5Mub5ppkIGqeGarICa1afTa4vNCV43I8JAWcjqjE0QTBd-9pJS6_F6l_pzaZ_9EVnu_DlmCxI9hZKYSXg'
const TABLE = 'daily_shares'

/** 内容模式 */
export const CONTENT_MODE = {
	IMAGE: 'image',     // 专属会员分享
	THOUGHT: 'thought'  // 365天思考实验
}

const MOCK_DELAY = 300

/* ==================== CloudBase REST（PostgREST 风格） ==================== */

function pad(n) {
	return String(n).padStart(2, '0')
}

function authHeaders() {
	return {
		Authorization: `Bearer ${CLOUDBASE_PUBLISHABLE_KEY}`
	}
}

/** '2026-09' -> { start: '2026-09-01', end: '2026-09-30' } */
function monthRange(month) {
	const match = /^(\d{4})-(\d{2})$/.exec(month || '')
	if (!match) return null
	const year = Number(match[1])
	const monthNum = Number(match[2])
	// 数据层计算当月最后一天，仅用于查询范围，不涉及日历 UI 逻辑
	const lastDay = new Date(year, monthNum, 0).getDate()
	return {
		start: `${month}-01`,
		end: `${month}-${pad(lastDay)}`
	}
}

/** '2026-10-08' -> '2026-10-09'（跨月交给 Date.UTC 处理） */
function nextDate(date) {
	const d = new Date(Date.UTC(
		Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + 1
	))
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** created_at 是带时区的时刻，按北京时间的自然日圈区间（+ 号必须编码成 %2B） */
function createdBetween(fromDate, toDateExclusive) {
	return `created_at=gte.${encodeURIComponent(`${fromDate}T00:00:00+08:00`)}` +
		`&created_at=lt.${encodeURIComponent(`${toDateExclusive}T00:00:00+08:00`)}`
}

/** 表里没有 id 和日期列，补齐成页面用的统一结构 */
function cloudShare(raw, index) {
	const createdAt = raw.created_at || ''
	return {
		id: `${createdAt}-${index}`,
		share_date: createdAt.slice(0, 10),
		image_url: raw.image_url || '',
		caption: '',
		source_name: '',
		created_at: createdAt,
		mode: CONTENT_MODE.THOUGHT
	}
}

function fetchShareDatesFromCloud(month) {
	const range = monthRange(month)
	if (!range) return Promise.resolve([])
	const url = `${CLOUDBASE_BASE}/v1/rdb/rest/${TABLE}?select=created_at` +
		`&${createdBetween(range.start, nextDate(range.end))}&order=created_at.asc`
	return request({ url, header: authHeaders() }).then((rows) => {
		const list = Array.isArray(rows) ? rows : []
		return [...new Set(list.map((r) => String(r.created_at || '').slice(0, 10)))]
			.filter(Boolean)
			.sort()
	})
}

function fetchSharesByDateFromCloud(date) {
	const url = `${CLOUDBASE_BASE}/v1/rdb/rest/${TABLE}?select=image_url,created_at` +
		`&${createdBetween(date, nextDate(date))}&order=created_at.asc`
	return request({ url, header: authHeaders() }).then((rows) => {
		const list = Array.isArray(rows) ? rows : []
		return list.map(cloudShare)
	})
}

/* ==================== 模拟数据 ==================== */

const MOCK_IMAGES = [
	'/static/mock/share-01.png'
]

const MOCK_CAPTIONS = [
	'今日份分享，保持热爱，奔赴山海。',
	'每日精选，快来查收今天的好内容。',
	'分享一张好图，看完心情会变好。',
	'今日推荐，值得点开看大图的一张。',
	'又是有收获的一天，记录一下。',
	'周末愉快，送上一张轻松的分享。',
	'这一张值得放大看，细节很到位。',
	'今天的分享来得稍微晚了一些。',
	'收藏起来，总有一天用得上。',
	'老规矩，每天一张，不见不散。'
]

// 思考实验的文案（真实数据里这些文字会直接排版在图片上，
// 这里仅用于模拟数据的 caption 展示位）
const MOCK_THOUGHT_CAPTIONS = [
	'思考实验 001：如果今天只能做一件事，你会选什么？',
	'思考实验 002：把「我不行」换成「我还没试过」。',
	'思考实验 003：假设一年后回看今天，什么值得？',
	'思考实验 004：如果没有人会知道，你还会做吗？',
	'思考实验 005：用一句话，说清你现在最想要的东西。',
	'思考实验 006：如果失败零成本，你想尝试什么？',
	'思考实验 007：把注意力当成最贵的货币，你会买什么？',
	'思考实验 008：如果只剩三次机会，你会怎么选？',
	'思考实验 009：今天做一件「三个月后的自己会感谢」的事。',
	'思考实验 010：把复杂问题拆成明天就能做的一小步。'
]

function todayInfo() {
	const t = new Date()
	return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }
}

/**
 * 某天是否有内容（确定性规则，保证刷新后数据一致）
 * 两种模式使用不同的取模节奏，从而自然产生三种情况：
 *   只有专属会员分享 / 只有思考实验 / 两者都有 —— 用于验证日历的双色打点。
 * 当月只覆盖到今天，未来日期一律无内容。
 */
function mockHasShares(year, month, day, mode) {
	const now = todayInfo()
	const monthsDiff = (year - now.y) * 12 + (month - now.m)
	if (monthsDiff > 0) return false
	if (monthsDiff === 0 && day > now.d) return false

	if (mode === CONTENT_MODE.THOUGHT) {
		// 思考实验：约 2/3 的天数有内容（周期 3）
		return (day + month) % 3 !== 0
	}
	// 专属会员分享：约 3/4 的天数有内容（周期 4）
	// 周期 3 与 4 互质，因此同一天既可能只有一种、也可能两者都有
	return (day * 2 + month) % 4 !== 3
}

/** 某天某种内容条数 */
function mockShareCount(year, month, day, mode) {
	if (mode === CONTENT_MODE.THOUGHT) {
		return ((day * 5 + month * 3) % 2) + 1 // 1 ~ 2 条
	}
	return ((day * 7 + month * 5) % 3) + 1 // 1 ~ 3 条
}

function mockCreatedAt(date, index) {
	const hour = 8 + ((index * 5 + Number(date.slice(8, 10))) % 12)
	const minute = (index * 17 + 11) % 60
	return `${date} ${pad(hour)}:${pad(minute)}:00`
}

function buildMockShare(date, index, mode) {
	const day = Number(date.slice(8, 10))
	const isThought = mode === CONTENT_MODE.THOUGHT
	const img = MOCK_IMAGES[(day + index) % MOCK_IMAGES.length]
	const caption = isThought
		? MOCK_THOUGHT_CAPTIONS[(day + index * 2) % MOCK_THOUGHT_CAPTIONS.length]
		: MOCK_CAPTIONS[(day + index * 2) % MOCK_CAPTIONS.length]
	const createdAt = mockCreatedAt(date, index)
	return {
		id: Number(date.replace(/-/g, '')) * 10 + index,
		share_date: date,
		image_url: img,
		caption,
		source_name: isThought ? '365天思考实验' : 'Jack',
		created_at: createdAt,
		mode
	}
}

function mockShareDates(month, mode) {
	const match = /^(\d{4})-(\d{2})$/.exec(month || '')
	if (!match) return []
	const year = Number(match[1])
	const monthNum = Number(match[2])
	const daysInMonth = new Date(year, monthNum, 0).getDate()
	const dates = []
	for (let d = 1; d <= daysInMonth; d++) {
		if (mockHasShares(year, monthNum, d, mode)) {
			dates.push(`${month}-${pad(d)}`)
		}
	}
	return dates
}

function mockSharesForDate(date, mode) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return []
	const year = Number(date.slice(0, 4))
	const month = Number(date.slice(5, 7))
	const day = Number(date.slice(8, 10))
	if (!mockHasShares(year, month, day, mode)) return []
	const count = mockShareCount(year, month, day, mode)
	const shares = []
	for (let i = 0; i < count; i++) {
		shares.push(buildMockShare(date, i, mode))
	}
	return shares
}

function mockDelay(data) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(data), MOCK_DELAY)
	})
}

/* ==================== 对外接口 ==================== */

/** 思考实验的内容已经在 CloudBase 表里，固定走它；专属会员分享仍按 DATA_SOURCE */
function usesCloud(mode) {
	return DATA_SOURCE === 'cloudbase' || mode === CONTENT_MODE.THOUGHT
}

/**
 * 获取某个月份有内容的日期集合（日历打点用）
 * @param {string} month 格式 YYYY-MM
 * @param {string} [mode] 内容模式，默认专属会员分享
 * @returns {Promise<string[]>} ['YYYY-MM-DD', ...]
 */
export function getShareDates(month, mode = CONTENT_MODE.IMAGE) {
	if (DATA_SOURCE === 'mock') {
		return mockDelay(mockShareDates(month, mode))
	}
	if (usesCloud(mode)) {
		return fetchShareDatesFromCloud(month)
	}
	// COS 清单：打点失败静默降级为当月无内容（页面已有空态，不打扰）
	return getManifest(mode)
		.then((manifest) => datesFromManifest(manifest, month))
		.catch(() => [])
}

/**
 * 获取某一天的内容列表
 * @param {string} date 格式 YYYY-MM-DD
 * @param {string} [mode] 内容模式，默认专属会员分享
 * @returns {Promise<Array>} 统一结构的内容数组
 */
export function getSharesByDate(date, mode = CONTENT_MODE.IMAGE) {
	if (DATA_SOURCE === 'mock') {
		return mockDelay(mockSharesForDate(date, mode))
	}
	if (usesCloud(mode)) {
		return fetchSharesByDateFromCloud(date)
	}
	// COS 清单：内容区失败要抛出去，页面会显示「内容加载失败」+ 重试按钮
	return getManifest(mode).then((manifest) => sharesFromManifest(manifest, date, mode))
}
