/**
 * Cloudflare Worker：用户数据读写（背后是 R2 桶）
 *
 * 为什么要有这一层：客户端直连 R2 要走 S3 签名，签名需要 AK/SK，
 * 这对钥匙打进 APK 等于把整个桶的删除权交给用户。Worker 用绑定读写，
 * 密钥只留在 Cloudflare 侧，不进包、不进仓库。
 *
 * 约定：一个用户 = 桶里一个对象，对象名就是设备号（App 首启生成的 uuid）。
 * 设备号是 128 位随机串，猜不到，所以"知道设备号"就等同"是这个用户本人"。
 */

// 一次最多收多少字节：用户全量数据实测只有几十 KB，200KB 已经是很宽的余量
const MAX_BYTES = 200 * 1024
// 只放行 uuid / 十六进制这类高熵标识，挡掉 ../ 之类的路径把戏
const ID_RE = /^[a-f0-9][a-f0-9-]{6,63}$/i

function corsHeaders(origin) {
	return {
		'access-control-allow-origin': origin || '*',
		'access-control-allow-methods': 'GET, PUT, OPTIONS',
		'access-control-allow-headers': 'content-type',
		'access-control-max-age': '86400'
	}
}

export default {
	async fetch(request, env) {
		const headers = corsHeaders(request.headers.get('origin'))
		const id = new URL(request.url).pathname.replace(/^\/+/, '')

		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
		if (!env.BUCKET) return new Response('bucket not bound', { status: 500, headers })
		if (!ID_RE.test(id)) return new Response('bad id', { status: 400, headers })

		if (request.method === 'GET') {
			const obj = await env.BUCKET.get(id)
			if (!obj) return new Response('null', { status: 404, headers })
			return new Response(obj.body, {
				headers: { ...headers, 'content-type': 'application/json' }
			})
		}

		if (request.method === 'PUT') {
			const body = await request.arrayBuffer()
			if (body.byteLength > MAX_BYTES) return new Response('too large', { status: 413, headers })
			// 只收合法 JSON，避免桶里被塞进垃圾对象
			try {
				JSON.parse(new TextDecoder().decode(body))
			} catch (e) {
				return new Response('bad json', { status: 400, headers })
			}
			await env.BUCKET.put(id, body, { httpMetadata: { contentType: 'application/json' } })
			return new Response('ok', { headers })
		}

		return new Response('method not allowed', { status: 405, headers })
	}
}
