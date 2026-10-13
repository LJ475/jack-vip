import { request } from './request.js'

/**
 * 账号层：用 Supabase 的 REST 接口直接调，不引任何 SDK，跟项目里其它请求一套写法。
 *
 * 本 App 只有登录，没有注册：账号由管理员在 supabase\admin.html 后台开通，
 * 服务端也关了 Supabase 的「Allow new users to sign up」（关了之后 /auth/v1/signup 才真的调不通）。
 *
 * 【还没配置】建好 Supabase 项目后，把下面两行填上（Project Settings → API 里复制）：
 *   - SUPABASE_URL     形如 https://abcdefgh.supabase.co
 *   - SUPABASE_ANON_KEY  那串很长的 anon public key（设计上就是给客户端用的）
 * 没填的话，登录会直接提示"还没配置"，不会假装成功。
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
 *
 * 覆盖范围：账号这条链路上的四个接口
 *   登录    POST /auth/v1/token?grant_type=password
 *   续期    POST /auth/v1/token?grant_type=refresh_token
 *   登出    POST /auth/v1/logout
 *   改密码  PUT  /auth/v1/user
 * 错误码清单取自 GoTrue 源码 internal/api/apierrors/errorcode.go，不是猜的。
 *
 * 响应体实测长这样（四种都见过）：
 *   {"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}
 *   {"code":422,"error_code":"weak_password","msg":"Password should be at least 6 characters.","weak_password":{...}}
 *   {"code":400,"error_code":"validation_failed","msg":"Unable to validate email address: invalid format"}
 *   {"code":422,"error_code":"user_already_exists","msg":"User already registered"}
 * 注意 code 是 HTTP 状态数字，真正的语义在 error_code + msg 上。
 */
const CODE_TEXT = {
	// ── 登录 ────────────────────────────────────────────────────────────
	invalid_credentials: '邮箱或密码不对',
	email_not_confirmed: '邮箱还没验证，先去收件箱点一下确认',
	user_banned: '这个账号已被停用',
	user_not_found: '没有这个邮箱对应的账号，先去注册一个',
	// ── 注册 ────────────────────────────────────────────────────────────
	user_already_exists: '这个邮箱已经注册过了，直接登录吧',
	email_exists: '这个邮箱已经注册过了，直接登录吧',
	weak_password: '密码太简单了，换一个长一点的',
	validation_failed: '填写的内容有误，检查一下邮箱和密码',
	email_address_invalid: '这个邮箱地址不能用，换一个真实的邮箱',
	email_address_not_provided: '请先填邮箱地址',
	// 免费档的内置邮件服务只肯发给「项目团队成员」的邮箱，其他人注册必然撞这条
	email_address_not_authorized: '这个邮箱收不到验证邮件，换个邮箱试试',
	// 这个码登录和注册都会回，原文不同（靠 MSG_RULES 分开翻），这里只是拿不到原文时的兜底
	email_provider_disabled: '这个项目的邮箱登录和注册都被关闭了',
	signup_disabled: '这个项目暂时没开放注册',
	provider_disabled: '这个登录方式暂时没开放',
	// ── 频率限制 ────────────────────────────────────────────────────────
	over_request_rate_limit: '操作太频繁了，等一分钟再试',
	over_email_send_rate_limit: '邮件发得太频繁了，过一会儿再试',
	// ── 人机验证 / 服务端钩子 ───────────────────────────────────────────
	captcha_failed: '人机验证没通过，再试一次',
	hook_timeout: '服务暂时没响应，稍后再试',
	hook_timeout_after_retry: '服务暂时没响应，稍后再试',
	hook_payload_over_size_limit: '提交的内容太大了',
	hook_payload_invalid_content_type: '提交的内容格式不对，稍后再试',
	// ── 登录态失效（续期/登出时出现）────────────────────────────────────
	session_not_found: '登录状态已失效，重新登录一下',
	session_expired: '登录过期了，重新登录一下',
	refresh_token_not_found: '登录状态已失效，重新登录一下',
	refresh_token_already_used: '登录状态已失效，重新登录一下',
	bad_jwt: '登录状态异常，重新登录一下',
	no_authorization: '登录状态异常，重新登录一下',
	// ── 修改密码（已登录时走 PUT /auth/v1/user）────────────────────────
	same_password: '新密码不能和原来的密码一样',
	current_password_invalid: '当前密码不对',
	current_password_required: '请先填当前密码',
	// Supabase 开着「Secure password change」时，会话太旧会被拒，要重新验证身份
	reauthentication_needed: '登录状态太久没验证了，退出重新登录一次再改',
	reauthentication_not_valid: '身份验证没通过，再试一次',
	// ── 请求本身 / 服务端 ───────────────────────────────────────────────
	bad_json: '提交的数据有问题，稍后再试',
	request_entity_too_large: '提交的内容太大了',
	request_timeout: '请求超时了，检查一下网络再试',
	conflict: '操作冲突了，稍后再试',
	feature_disabled: '这个功能暂时没开放',
	unexpected_failure: '服务器出错了，稍后再试',
	unknown: '操作没成功，稍后再试'
}

/** 先按英文原句匹配（比错误码更具体），再按错误码兜底 */
const MSG_RULES = [
	[/Invalid login credentials/i, () => '邮箱或密码不对'],
	[/already registered|already exists|An account with this email/i, () => '这个邮箱已经注册过了，直接登录吧'],
	[/Password should be at least\s*(\d+)/i, (m) => `密码太短，至少 ${m[1]} 位`],
	[/Unable to validate email address/i, () => '邮箱格式看起来不对'],
	[/email address .* is invalid/i, () => '这个邮箱地址不能用，换一个真实的邮箱'],
	// Supabase 内置邮件服务只发给项目团队成员的邮箱，其他邮箱注册时回 403
	// email_address_not_authorized，原文就是下面这句（跟「格式无效」是两回事，别混）
	[/Email address not authorized/i, () => '这个邮箱收不到验证邮件，换个邮箱试试'],
	[/Email (?:address )?not confirmed/i, () => '邮箱还没验证，去收件箱点一下确认'],
	[/Email address not provided/i, () => '请先填邮箱地址'],
	[/Could not find user/i, () => '没有这个邮箱对应的账号，先去注册一个'],
	// 项目配置类：Dashboard 里的开关没开，用户自己解决不了，只能提示联系管理员
	// 同一个错误码，登录和注册都会回，且原文不同（实测：登录 "Email logins are disabled"，
	// 注册 "Email signups are disabled"）。必须分开翻，否则登录的人会看到"没开放注册"，莫名其妙。
	[/Email logins are disabled/i, () => '这个项目关闭了邮箱登录，请联系管理员'],
	[/Email signups are disabled/i, () => '这个项目关闭了邮箱注册，请联系管理员'],
	[/Email provider is disabled|Signups? not allowed|Signups? disabled/i, () => '这个项目暂时没开放注册'],
	[/User is banned/i, () => '这个账号已被停用'],
	// 修改密码
	[/New password should be different from the old password|same_password/i, () => '新密码不能和原来的密码一样'],
	[/Current password is invalid|current_password_invalid/i, () => '当前密码不对'],
	[/[Rr]eauthentication/i, () => '登录状态太久没验证了，退出重新登录一次再改'],
	// 登录态失效：续期用的 refresh_token 没了/被用过/已吊销
	[/Invalid Refresh Token|Refresh Token Not Found|refresh token/i, () => '登录状态已失效，重新登录一下'],
	[/Auth session missing|session_not_found|session_expired/i, () => '登录状态已失效，重新登录一下'],
	[/For security purposes, you can only request this after/i, () => '操作太频繁了，等一会儿再试'],
	[/email rate limit|over_email_send_rate_limit/i, () => '邮件发得太频繁了，过一会儿再试'],
	[/rate limit|too many requests/i, () => '操作太频繁了，等一会儿再试'],
	[/captcha/i, () => '人机验证没通过，再试一次'],
	[/smtp|failed to send (?:the )?email/i, () => '注册邮件发送失败，稍后再试一次'],
	// 放在网络那条前面：GoTrue 的 request_timeout 原文也含 timeout，别被误判成断网
	[/Request timeout|context deadline exceeded/i, () => '请求超时了，检查一下网络再试'],
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
	// 兜底：绝不把英文原文甩给用户。原文和错误码写进控制台，排查时看那里。
	// 但 request.js 自己那句「请求失败（429）」不算服务端原文，别记它，否则限流时刷屏。
	const serverSaid = msg && !/^请求失败（\d+）$/.test(msg)
	if (serverSaid || code) {
		try {
			console.warn('[auth] 没翻译过的服务端报错：', { status, code, msg })
		} catch (err) { /* 控制台用不了就算了，不能因此再抛一个错 */ }
	}
	if (status === 429) return '操作太频繁了，等一分钟再试'
	if (status === 401 || status === 403) return '邮箱或密码不对，或登录已过期，再试一次'
	if (status >= 500) return '服务器出错了，稍后再试'
	if (status === 400 || status === 422) return '提交的信息有问题，检查一下再试'
	return '操作没成功，稍后再试'
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
/** 免登录页：登录页本身，以及从登录页能点进去的条款页
 *  （否则点《用户协议》会被弹回登录页） */
export const OPEN_ROUTES = ['pages/login/index', 'pages/agreement/index']

export function guardSession() {
	if (getSession()) return false
	const pages = getCurrentPages()
	const route = pages.length ? (pages[pages.length - 1].route || '') : ''
	if (OPEN_ROUTES.includes(route)) return false
	// 过期不等于没登录：先拿 refresh_token 续一次，续上了就留在当前页，续不上才挡
	if (readStoredSession() && readStoredSession().refreshToken) {
		refreshSession().then((s) => {
			// 只有「本机本来有登录态、续期没成功」才算过期，这时候才带 expired=1
			if (!s) uni.reLaunch({ url: '/pages/login/index?expired=1' })
			// 刚续上就顺手报个心跳：不然隔了一小时回来，后台要等定时器才知道人在线
			else heartbeat()
		})
		return false
	}
	// 本机压根没有登录态（新装/刚退出）：这是"还没登录"，不是"过期"，
	// 带上 expired=1 会让第一次打开的人看到"登录状态已过期"，莫名其妙
	uni.reLaunch({ url: '/pages/login/index' })
	return true
}

/** 往 public.users 写一行（表见仓库 README 里的建表 SQL）；失败静默，不影响登录本身 */
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
		// 立刻报一次心跳（force 掉节流），后台不用干等定时器那 60 秒才看到人上线
		heartbeat(true)
		return s
	}).catch((e) => {
		throw new Error(humanError(e))
	})
}

/**
 * 修改密码（已登录状态下，不需要邮箱、不发任何邮件）
 *
 * 分两步：
 *   ① 先用「当前密码」重新登录一次
 *   ② 拿刚换来的会话去 PUT /auth/v1/user 改密码
 *
 * 为什么不直接改，要先重新登录：
 *   - 验证「确实是本人」：不然捡到手机的人打开 App 就能直接改密码，把号占了；
 *   - 换一个新鲜会话：Supabase 开着「Secure password change」时，旧会话改密码会被拒
 *     （reauthentication_needed），刚登录出来的会话不会。
 *
 * @returns {Promise<true>} 失败抛出的 Error.message 已经是中文
 */
export function changePassword(currentPassword, newPassword) {
	if (!isConfigured()) return Promise.reject(new Error('还没配置 Supabase，先把 URL 和 anon key 填进 utils/auth.js'))

	const s = getSession()
	if (!s || !s.user || !s.user.email) return Promise.reject(new Error('登录状态已失效，重新登录一下'))
	if (!currentPassword) return Promise.reject(new Error('请先填当前密码'))
	if (!newPassword || newPassword.length < 6) return Promise.reject(new Error('新密码至少 6 位'))
	if (newPassword === currentPassword) return Promise.reject(new Error('新密码不能和当前密码一样'))

	const email = s.user.email

	return request({
		url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
		method: 'POST',
		header: apiHeaders(),
		data: { email, password: currentPassword }
	}).then((data) => {
		if (!data || !data.access_token) throw new Error('当前密码不对')
		saveSession(data)
		return data.access_token
	}, (e) => {
		// 只有「密码错」才说密码错。限流/断网要原样报 ——
		// 否则用户会以为密码错了，反复去改一个其实正确的密码。
		const { code, status } = readErr(e)
		const wrong = code === 'invalid_credentials' || code === 'user_not_found' || status === 400
		throw new Error(wrong ? '当前密码不对' : humanError(e))
	}).then((token) => {
		return request({
			url: `${SUPABASE_URL}/auth/v1/user`,
			method: 'PUT',
			header: apiHeaders({ Authorization: `Bearer ${token}` }),
			data: { password: newPassword }
		}).then(() => true, (e) => {
			throw new Error(humanError(e))
		})
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

/* ── 心跳：让后台知道"这个人现在开着 app" ──────────────────────────
 *
 * 【为什么需要它】
 * Supabase 不提供「谁在线」的接口 —— /admin/users/{id}/sessions、/admin/sessions、
 * /admin/users/{id}/access-tokens 全是 404（实测过）。用户记录里只有 last_sign_in_at，
 * 而它只记录真正登录那一刻：拿 refresh_token 续期**不会**刷新它（也实测过）。
 * 所以"在线"只能由 app 自己报。
 *
 * 【报在哪】user_metadata.last_seen
 *   没写 public.users，是为了不改数据库（省得手动跑 SQL）；
 *   而且后台拉 /admin/users 时本来就带着 user_metadata，不用多发一次请求。
 *   PUT /auth/v1/user 传 data 是**合并**，不会把别的 metadata 冲掉。
 *
 * 【节流】默认 60 秒最多报一次 —— 切页面切得勤也不会狂发请求。
 */
const HEARTBEAT_GAP = 60 * 1000
let lastBeatAt = 0

export function heartbeat(force) {
	const s = getSession()
	if (!s || !s.accessToken || !isConfigured()) return
	const now = Date.now()
	if (!force && now - lastBeatAt < HEARTBEAT_GAP) return
	lastBeatAt = now
	request({
		url: `${SUPABASE_URL}/auth/v1/user`,
		method: 'PUT',
		header: apiHeaders({ Authorization: `Bearer ${s.accessToken}` }),
		data: { data: { last_seen: new Date().toISOString() } }
	}).catch(() => {
		// 报失败就把节流放开，下次页面显示时立刻重试
		lastBeatAt = 0
	})
}
