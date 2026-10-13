#!/usr/bin/env node
/**
 * 账号管理后台 · 本地服务
 *
 * 【为什么需要它】
 * Supabase 明令禁止 sb_secret_ 密钥在浏览器里使用 —— 它的网关会检查 User-Agent，
 * 只要认出是浏览器就直接拒掉：
 *     {"message":"Forbidden use of secret API key in browser"}
 * 所以浏览器**永远**用不了这把密钥，页面怎么写都没用。
 *
 * 这个服务夹在中间：
 *     浏览器  →  本服务（持密钥）  →  Supabase
 * 浏览器永远看不到密钥，而本服务发的 User-Agent 不是浏览器的，Supabase 就放行。
 *
 * 【怎么跑】
 *   双击  supabase\启动后台.bat
 * 或者手动：
 *   node supabase\admin-server.mjs
 *
 * 【密钥放哪】
 *   C:\Users\<你的用户名>\.jack-admin\supabase-secret.txt
 *   ★ 故意放在【项目外面】：项目目录会被打包、同步、发给别人，
 *     放里面万一哪天被打进 APK 就是灾难。放外面就不可能被带进去。
 *   换密钥就改这个文件，不用动代码。
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
// 密钥放在项目外面，见文件头【密钥放哪】
const SECRET_FILE = join(homedir(), '.jack-admin', 'supabase-secret.txt')
const AUTH_FILE = join(ROOT, 'utils', 'auth.js')
const HTML_FILE = join(HERE, 'admin.html')

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT || 8787)

// ★ 关键：绝对不能用浏览器 UA。
//   Supabase 网关看到 Mozilla/Chrome 这类 UA 就会拒掉 secret 密钥。
//   服务端报一个自己的名字，就没有这个问题（实测 200 通过）。
const UA = 'jack-admin-local/1.0'

/* ── 读配置 ─────────────────────────────────────────────────────── */
function readKey() {
	if (!existsSync(SECRET_FILE)) return ''
	return readFileSync(SECRET_FILE, 'utf8').replace(/[\s\u00A0\u200B\u200C\u200D\u2060\uFEFF]+/g, '')
}
function readProjectUrl() {
	const t = readFileSync(AUTH_FILE, 'utf8')
	const m = t.match(/SUPABASE_URL\s*=\s*'([^']+)'/)
	if (!m) throw new Error('读不到 utils/auth.js 里的 SUPABASE_URL')
	return m[1].replace(/\/+$/, '')
}
function keyKind(k) {
	if (!k) return '（没读到密钥）'
	if (/^sb_secret_/.test(k)) return '新版 secret 密钥'
	if (/^sb_publishable_/.test(k)) return 'publishable 公开密钥（没管理权限）'
	if (/^eyJ/.test(k)) {
		try {
			const p = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString('utf8'))
			return '旧版 JWT · 角色 ' + (p.role || '未知')
		} catch (e) { return '旧版 JWT（解不开）' }
	}
	return '未知格式'
}

const KEY = readKey()
let SUPA = ''
try { SUPA = readProjectUrl() } catch (e) {
	console.error('\n  ❌ ' + e.message + '\n')
	process.exit(1)
}

/* ── 转发给 Supabase ────────────────────────────────────────────── */
async function supaFetch(path, opts) {
	opts = opts || {}
	const headers = Object.assign({
		apikey: KEY,
		Authorization: 'Bearer ' + KEY,
		'Content-Type': 'application/json',
		'User-Agent': UA
	}, opts.headers || {})
	const res = await fetch(SUPA + path, Object.assign({}, opts, { headers }))
	return { status: res.status, text: await res.text() }
}

/* ── HTTP 小工具 ────────────────────────────────────────────────── */
function json(res, code, obj) {
	const body = JSON.stringify(obj)
	res.writeHead(code, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(body)
	})
	res.end(body)
}
function readBody(req) {
	return new Promise((resolve) => {
		const chunks = []
		req.on('data', (c) => chunks.push(c))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		req.on('error', () => resolve(''))
	})
}

/* ── 路由 ───────────────────────────────────────────────────────── */
const server = createServer(async (req, res) => {
	let u
	try { u = new URL(req.url, 'http://' + HOST) } catch (e) { return json(res, 400, { message: 'bad url' }) }
	const path = u.pathname

	// 后台页面
	if (path === '/' || path === '/index.html') {
		if (!existsSync(HTML_FILE)) return json(res, 500, { message: '找不到 admin.html' })
		const html = readFileSync(HTML_FILE)
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length })
		return res.end(html)
	}

	// 配置 + 密钥体检
	if (path === '/api/info') {
		const base = {
			project: SUPA.replace('https://', '').replace('.supabase.co', ''),
			url: SUPA,
			keyKind: keyKind(KEY),
			keyLen: KEY.length
		}
		if (!KEY) return json(res, 200, Object.assign(base, { ok: false, error: '还没放密钥。把 sb_secret_… 写进 C:\\Users\\<你>\\.jack-admin\\supabase-secret.txt' }))
		try {
			// 只探一次能不能通。注意 Supabase 这个接口返回的是 {users, aud}，
			// 【没有 total 字段】—— 别去读它，账号数由面板自己拉全量列表算。
			const r = await supaFetch('/auth/v1/admin/users?page=1&per_page=1')
			const ok = r.status === 200
			return json(res, 200, Object.assign(base, {
				ok: ok,
				upstreamStatus: r.status,
				upstreamBody: ok ? '' : String(r.text).slice(0, 300)
			}))
		} catch (e) {
			return json(res, 200, Object.assign(base, { ok: false, error: '连不上 Supabase：' + (e.message || e) }))
		}
	}

	// 其它一律当 Supabase Auth 请求转发
	if (path.startsWith('/auth/v1/')) {
		const body = (req.method === 'GET' || req.method === 'HEAD') ? undefined : await readBody(req)
		try {
			const r = await supaFetch(path + u.search, { method: req.method, body: body || undefined })
			res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8' })
			return res.end(r.text)
		} catch (e) {
			return json(res, 502, { message: '连不上 Supabase：' + (e.message || e) })
		}
	}

	json(res, 404, { message: 'not found' })
})

/* ── 起服务 ─────────────────────────────────────────────────────── */
server.listen(PORT, HOST, () => {
	const url = 'http://' + HOST + ':' + PORT + '/'
	console.log('')
	console.log('  ┌─────────────────────────────────────────────┐')
	console.log('  │   账号管理后台已经跑起来了                  │')
	console.log('  └─────────────────────────────────────────────┘')
	console.log('')
	console.log('   在浏览器打开：' + url)
	console.log('')
	console.log('   项目    ：' + SUPA)
	console.log('   密钥    ：' + (KEY ? keyKind(KEY) + '（' + KEY.length + ' 位）' : '❌ 没读到'))
	console.log('   密钥文件：' + SECRET_FILE)
	console.log('')
	console.log('   关掉这个窗口就停止服务。')
	console.log('')
})

server.on('error', (e) => {
	if (e.code === 'EADDRINUSE') {
		console.error('')
		console.error('  ❌ 端口 ' + PORT + ' 被占用了。')
		console.error('     可能后台已经开着一个了 —— 直接去浏览器打开 http://' + HOST + ':' + PORT + '/')
		console.error('     想换端口：  set PORT=8899 && node supabase\\admin-server.mjs')
		console.error('')
	} else {
		console.error('  ❌ 服务起不来：' + e.message)
	}
	process.exit(1)
})
