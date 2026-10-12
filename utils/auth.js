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

/** GoTrue 的英文报错翻成人话，翻不到就原样返回 */
function humanError(e) {
	const raw = (e && (e.message || e.msg || e.error_description)) || ''
	const m = String(raw)
	if (/Invalid login credentials/i.test(m)) return '邮箱或密码不对'
	if (/User already registered/i.test(m)) return '这个邮箱已经注册过了，直接登录吧'
	if (/Password should be at least/i.test(m)) return '密码太短，至少 6 位'
	if (/Unable to validate email address/i.test(m)) return '邮箱格式看起来不对'
	if (/Email not confirmed/i.test(m)) return '邮箱还没验证，去收件箱点一下确认链接'
	if (/over_email_send_rate_limit|For security purposes/i.test(m)) return '发送太频繁了，等一分钟再试'
	if (/Failed to fetch|Network|timeout/i.test(m)) return '网络好像不太行，检查一下再试'
	return m || '操作失败了，稍后再试'
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

export function currentUser() {
	const s = getSession()
	return s ? s.user : null
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
