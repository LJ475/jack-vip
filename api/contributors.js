import { request } from '../utils/request.js'

/**
 * 「感谢名单」接口层（提供数据的贡献者，各自展示抖音二维码）
 *
 * 数据存放在腾讯云 CloudBase（PostgREST 风格 HTTP API）：
 *   - 表 contributors：id（自动）/ name / avatar_url / qr_url
 *   - 头像与二维码图存的是公开访问直链（外部图床）
 *   - 列表按插入顺序（id 升序）展示
 *   - 鉴权：Authorization: Bearer <客户端 Publishable Key>（设计上可放前端，
 *     表上需开启 RLS 并配置放行 anon 角色的 Policy，否则默认拒绝返回空数据）
 *
 * USE_MOCK = true 时使用内置模拟数据（头像/二维码复用项目本地占位图）；
 * 正式环境保持 false。
 */
const USE_MOCK = false

const CLOUDBASE_ENV = 'jack-d8gkgnrc9cda47ee5'
const CLOUDBASE_BASE = `https://${CLOUDBASE_ENV}.api.tcloudbasegateway.com`
const CLOUDBASE_PUBLISHABLE_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjkzYzI4ZmNhLTFjZGUtNDViMC1hMzhiLTcwZDYxNGJmZjYxYyJ9.eyJpc3MiOiJodHRwczovL2phY2stZDhna2ducmM5Y2RhNDdlZTUuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6ImphY2stZDhna2ducmM5Y2RhNDdlZTUiLCJleHAiOjQwOTQyNjkzODgsImlhdCI6MTc5MDU4NjE4OCwibm9uY2UiOiJ1aUliOFBlWlFpLW5PZDBYMXZFZ0xBIiwiYXRfaGFzaCI6InVpSWI4UGVaUWktbk9kMFgxdkVnTEEiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoiamFjay1kOGdrZ25yYzljZGE0N2VlNSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.dBobdA4Fe66GtTFBQwTezU6Lnw_lXSH9-4sStCLucsqKsL530xPg8SzvEPqzTCpRbRCDrXapFWRW-S3noVVAuQKYpNMwumnxLLHci29Ucg5FE1GyNRwl980CpH1ZS5ke0qSz5LXhn1nyPGpdNXLfx2wE517rzs12128GufK5-O7_geJlePbVH79i3le4mDmrJhbSUgdUBZUwVFT5Ic7pRqAXGCqBGbnBrJIF_MFPoWzrC1MhHiQptOoT9vhNL0X5ZvMiA5Mub5ppkIGqeGarICa1afTa4vNCV43I8JAWcjqjE0QTBd-9pJS6_F6l_pzaZ_9EVnu_DlmCxI9hZKYSXg'
const TABLE = 'contributors'

const MOCK_DELAY = 300

/**
 * 统一后的贡献者结构：
 * { id, name, avatar_url, qr_url }
 */
function normalizeContributor(raw, index) {
	if (!raw) return null
	return {
		id: raw.id !== undefined && raw.id !== null ? raw.id : index + 1,
		name: raw.name || raw.nickname || '',
		avatar_url: raw.avatar_url || raw.avatarUrl || '',
		qr_url: raw.qr_url || raw.qrUrl || ''
	}
}

/* ==================== CloudBase REST（PostgREST 风格） ==================== */

function authHeaders() {
	return {
		Authorization: `Bearer ${CLOUDBASE_PUBLISHABLE_KEY}`
	}
}

function fetchContributorsFromCloud() {
	const url = `${CLOUDBASE_BASE}/v1/rdb/rest/${TABLE}?select=*&order=id.asc`
	return request({ url, header: authHeaders() }).then((rows) => {
		const list = Array.isArray(rows) ? rows : []
		return list.map(normalizeContributor).filter((c) => c && c.qr_url)
	})
}

/* ==================== 模拟数据 ==================== */

// 占位图：USE_MOCK = true 时使用的本地占位头像/二维码（正式数据来自 CloudBase contributors 表）
const MOCK_CONTRIBUTORS = [
	{ id: 1, name: '小明', avatar_url: '/static/logo.png', qr_url: '/static/douyin-qr.jpg' },
	{ id: 2, name: '阿豪', avatar_url: '/static/logo.png', qr_url: '/static/douyin-qr.jpg' },
	{ id: 3, name: '小红', avatar_url: '/static/logo.png', qr_url: '/static/douyin-qr.jpg' },
	{ id: 4, name: '大飞', avatar_url: '/static/logo.png', qr_url: '/static/douyin-qr.jpg' },
	{ id: 5, name: 'Lisa', avatar_url: '/static/logo.png', qr_url: '/static/douyin-qr.jpg' }
]

function mockDelay(data) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(data), MOCK_DELAY)
	})
}

/* ==================== 对外接口 ==================== */

/**
 * 获取感谢名单（按插入顺序）
 * @returns {Promise<Array>} 统一结构的贡献者数组
 */
export function getContributors() {
	if (USE_MOCK) {
		return mockDelay(MOCK_CONTRIBUTORS.map((c) => ({ ...c })))
	}
	return fetchContributorsFromCloud()
}
