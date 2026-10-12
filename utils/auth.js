import { request } from './request.js'

/**
 * 账号层：用 Supabase 的 REST 接口直接调，不引任何 SDK，跟项目里其它请求一套写法。
 *
 * 【还没配置】建好 Supabase 项目后，把下面两行填上（Project Settings → API 里复制）：
 *   - SUPABASE_URL     形如 https://abcdefgh.supabase.co
 *   - SUPABASE_ANON_KEY  那串很长的 anon public key（设计上就是给客户端用的）
 * 没填的话，注册/登录会直接提示"还没配置"，不会假装成功。
 */
export const SUPABASE_URL = 'https://tyqkjurbikcdtozuawrz.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cWtqdXJiaWtjZHRvenVhd3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDE0NTMsImV4cCI6MjEwNzMxNzQ1M30.cCv010tSxOL_gMOp0nK2BV2HUJt2oZ2g3Sl_ngm4LAk'

const SESSION_KEY = 'supabaseSession'

export function isConfigured() {
	return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 40
}

function apiHeaders(extra = {}) {
	return {
		apikey: SUPABASE_ANON_KEY,
		'content-type': 'application/json',
		...extra
	}
}

/**
 * GoTrue 的报错翻成人话。
 * 它的响应体实测长这样（四种都见过）：
 *   {"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}
 *   {"code":422,"error_code":"weak_password","msg":"Password should be at least 6 characters.","weak_password":{...}}
 *   {"code":400,"error_code":"validation_failed","msg":"Unable to validate email address: invalid format"}
 *   {"code":422,"error_code":"user_already_exists","msg":"User already registered"}
 * 注意 code 是 HTTP 状态数字，真正的语义在 error_code + msg 上。
 */
const CODE_TEXT = {
	invalid_credentials: '邮箱或密码不对',
	user_already_exists: '这个邮箱已经注册过了，直接登录吧',
	email_exists: '这个邮箱已经注册过了，直接登录吧',
	user_not_found: '没有这个邮箱对应的账号，先去注册一个',
	could_not_find_user: '没有这个邮箱对应的账号，先去注册一个',
	email_not_confirmed: '邮箱还没验证，去收件箱点一下确认链接',
	weak_password: '密码太短，至少 6 位',
	validation_failed: '填写的内容有误，检查一下邮箱和密码',
	signups_disabled: '这个项目暂时没开放注册',
	over_email_send_rate_limit: '邮件发得太快了，等一分钟再试',
	email_confirm_rate_limit: '确认邮件发得太快了，等一分钟再试',
	over_request_rate_limit: '操作太频繁了，等一分钟再试',
	rate_limit: '操作太频繁了，等一分钟再试'
}

/** 先按英文原句匹配（比错误码更具体），再按错误码兜底 */
const MSG_RULES = [
	[/Invalid login credentials/i, () => '邮箱或密码不对'],
	[/already registered|already exists|An account with this email/i, () => '这个邮箱已经注册过了，直接登录吧'],
	[/Password should be at least\s*(\d+)/i, (m) => `密码太短，至少 ${m[1]} 位`],
	[/Unable to validate email address/i, () => '邮箱格式看起来不对'],
	[/Email (?:address )?not confirmed/i, () => '邮箱还没验证，去收件箱点一下确认链接'],
	[/Could not find user/i, () => '没有这个邮箱对应的账号，先去注册一个'],
	[/Signups? not allowed/i, () => '这个项目暂时没开放注册'],
	[/For security purposes, you can only request this after/i, () => '操作太频繁了，等一会儿再试'],
	[/rate limit|too many requests/i, () => '操作太频繁了，等一分钟再试'],
	[/smtp|failed to send (?:the )?email/i, () => '注册邮件发送失败，稍后再试一次'],
	[/Failing to fetch|Network request failed|Network Error|networkerror|timeout|abort|ERR_/i, () => '网络好像不太行，检查一下再试']
]

/** 从异常里把响应体中的语义挑出来：请求封装非 2xx 时会把 body 挂在 err.data 上 */
function readErr(e) {
	const d = e && e.data
	let msg = ''
	let code = ''
	let status = Number(e && e.statusCode) || 0
	if (typeof d === 'string') {
		msg = d
	} else if (d && typeof d === 'object') {
		code = String(d.error_code || (typeof d.code === 'string' ? d.code : '') || '')
		msg = String(
			d.msg || d.error_description || d.message ||
			(d.error && (typeof d.error === 'string' ? d.error : d.error.msg || d.error.message)) || ''
		)
		if (!status) status = Number(d.code) || 0
	}
	if (!msg) msg = String((e && (e.message || e.errMsg || e.error_description)) || '')
	if (!code && e && typeof e.code === 'string') code = e.code
	return { msg, code, status }
}

function humanError(e) {
	const { msg, code, status } = readErr(e)
	for (const [re, toText] of MSG_RULES) {
		const m = re.exec(msg)
		if (m) return toText(m)
	}
	if (code && CODE_TEXT[code]) return CODE_TEXT[code]
	if (status === 401 || status === 403) return '邮箱或密码不对，或登录已过期，再试一次'
	if (status >= 500) return 'Supabase 那边出错了，稍后再试'
	// 实在认不出来的英文原样留着（比"请求失败（400）"有用），但没有就报状态
	return msg || `操作没成功（${status || '未知'}），稍后再试`
}

function saveSession(data) {
	const session = {
		accessToken: data.access_token || '',
		refreshToken: data.refresh_token || '',
		expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
		user: data.user || null
	}
	try {
		uni.setStorageSync(SESSION_KEY, session)
	} catch (e) { /* 存不下只影响下次免登录，不影响本次 */ }
	return session
}

/** 本机保存的登录态；过期或没登录返回 null */
export function getSession() {
	let s = null
	try {
		s = uni.getStorageSync(SESSION_KEY) || null
	} catch (e) { /* 读不到就是没登录 */ }
	if (!s || !s.accessToken) return null
	if (s.expiresAt && Date.now() > s.expiresAt) return null
	return s
}

/** 不看有效期、原样读出本机存过的会话（只为拿 refresh_token 用） */
function readStoredSession() {
	try {
		return uni.getStorageSync(SESSION_KEY) || null
	} catch (e) {
		return null
	}
}

/**
 * access_token 过期就用 refresh_token 续一次。
 * 成功返回新会话；没有 refresh_token、或续期失败（被吊销/网络挂了）返回 null 并清掉本机登录态。
 * 并发调用共用同一个在途请求，避免冷启动时 App.vue 和页面守卫各打一次。
 */
let refreshing = null
export function refreshSession() {
	const stored = readStoredSession()
	if (!stored || !stored.refreshToken || !isConfigured()) return Promise.resolve(null)
	if (refreshing) return refreshing
	refreshing = request({
		url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
		method: 'POST',
		header: apiHeaders({ Authorization: `Bearer ${SUPABASE_ANON_KEY}` }),
		data: { refresh_token: stored.refreshToken }
	}).then((data) => {
		if (!data || !data.access_token) throw new Error('续期没返回 access_token')
		return saveSession(data)
	}).catch(() => {
		try {
			uni.removeStorageSync(SESSION_KEY)
		} catch (e) /* 清不掉也不阻塞 */ { }
		return null
	}).finally(() => {
		refreshing = null
	})
	return refreshing
}

/** 确保有可用登录态：没过期直接给，过期就先续一次；返回 null 才当"没登录" */
export function ensureSession() {
	const s = getSession()
	if (s) return Promise.resolve(s)
	return refreshSession()
}

export function currentUser() {
	const s = getSession()
	return s ? s.user : null
}

/**
 * 页面级登录闸门：页面每次显示都验一次本机登录态，没登录就把它换回登录页。
 * 只挡在 App.vue 的 onLaunch 是不够的——H5 里按浏览器返回、或直接改地址栏的 hash
 * 都能落到任意页面上，那时 onLaunch 早跑完了。
 * @returns {boolean} true = 已拦截并跳走
 */
export function guardSession() {
	if (getSession()) return false
	const pages = getCurrentPages()
	const route = pages.length ? (pages[pages.length - 1].route || '') : ''
	if (route === 'pages/login/index' || route === 'pages/register/index') return false
	// 过期不等于没登录：先拿 refresh_token 续一次，续上了就留在当前页，续不上才挡
	if (readStoredSession() && readStoredSession().refreshToken) {
		refreshSession().then((s) => {
			if (!s) uni.reLaunch({ url: '/pages/login/index' })
		})
		return false
	}
	uni.reLaunch({ url: '/pages/login/index' })
	return true
}

/**
 * 注册
 * @returns {Promise<{needConfirm: boolean, email: string}>} needConfirm=要先去邮箱点确认链接
 */
export function signUp(email, password) {
	if (!isConfigured()) return Promise.reject(new Error('还没配置 Supabase，先把 URL 和 anon key 填进 utils/auth.js'))
	return request({
		url: `${SUPABASE_URL}/auth/v1/signup`,
		method: 'POST',
		header: apiHeaders(),
		data: { email, password }
	}).then((data) => {
		// 开了邮箱确认时，signup 不返回 session，只返回 user
		if (data && data.access_token) saveSession(data)
		const user = (data && data.user) || null
		if (user && user.id) {
			// 顺手写一行到自己的 users 表（尽力而为：表还没建、或网络失败都不打断注册）
			insertUserInfo(user, email, data && data.access_token).catch(() => {})
		}
		return { needConfirm: !(data && data.access_token), email }
	}).catch((e) => {
		throw new Error(humanError(e))
	})
}

/** 往 public.users 写一行（表见仓库 README 里的建表 SQL）；失败静默，不影响注册/登录本身 */
function insertUserInfo(user, email, accessToken) {
	const token = accessToken || ''
	if (!token) return Promise.resolve()
	return request({
		url: `${SUPABASE_URL}/rest/v1/users?on_conflict=user_id`,
		method: 'POST',
		header: apiHeaders({
			Authorization: `Bearer ${token}`,
			Prefer: 'resolution=merge-duplicates,return=minimal'
		}),
		data: [{ user_id: user.id, email }]
	})
}

/** 登录 */
export function signIn(email, password) {
	if (!isConfigured()) return Promise.reject(new Error('还没配置 Supabase，先把 URL 和 anon key 填进 utils/auth.js'))
	return request({
		url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
		method: 'POST',
		header: apiHeaders(),
		data: { email, password }
	}).then((data) => {
		const s = saveSession(data)
		// 登录时也补一次：老用户（建表之前注册的）登录后就能补上自己那行
		if (s.user && s.user.id) insertUserInfo(s.user, email, s.accessToken).catch(() => {})
		return s
	}).catch((e) => {
		throw new Error(humanError(e))
	})
}

/**
 * 重发注册确认码（GoTrue 的 resend 路由）。
 * 60 秒冷却是服务端管的，超了会回 429，已被 humanError 翻成「操作太频繁了，等一分钟再试」。
 */
export function resendSignupOtp(email) {
	if (!isConfigured()) return Promise.reject(new Error('还没配置 Supabase，先把 URL 和 anon key 填进 utils/auth.js'))
	return request({
		url: `${SUPABASE_URL}/auth/v1/resend`,
		method: 'POST',
		header: apiHeaders(),
		data: { email, type: 'signup' }
	}).catch((e) => {
		throw new Error(humanError(e))
	})
}

/**
 * 用邮箱里那 6 位码确认注册。确认成功时 GoTrue 直接回登录态，省掉再登录一次。
 * @returns {Promise<object>} 原样返回 GoTrue 的响应（含 user / 可能有 session）
 */
export function verifySignupCode(email, token) {
	if (!isConfigured()) return Promise.reject(new Error('还没配置 Supabase，先把 URL 和 anon key 填进 utils/auth.js'))
	return request({
		url: `${SUPABASE_URL}/auth/v1/verify`,
		method: 'POST',
		header: apiHeaders(),
		data: { type: 'signup', email, token: String(token || '').trim() }
	}).then((data) => {
		if (data && data.access_token) saveSession(data)
		const user = (data && data.user) || null
		if (user && user.id) insertUserInfo(user, email, data && data.access_token).catch(() => {})
		return data
	}).catch((e) => {
		throw new Error(humanError(e))
	})
}

/** 登出：先清本机，再尽力通知服务端（失败也算登出成功，不然用户会卡住） */
export function signOut() {
	const s = getSession()
	try {
		uni.removeStorageSync(SESSION_KEY)
	} catch (e) { /* 清不掉也不阻塞 */ }
	if (!s || !isConfigured()) return Promise.resolve()
	return request({
		url: `${SUPABASE_URL}/auth/v1/logout`,
		method: 'POST',
		header: apiHeaders({ Authorization: `Bearer ${s.accessToken}` })
	}).catch(() => { /* 服务端异常不影响本机已登出 */ })
}
