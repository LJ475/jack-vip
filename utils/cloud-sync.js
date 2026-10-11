import { request } from './request.js'
import { CLOUDBASE_ENV, CLOUDBASE_PUBLISHABLE_KEY } from '@/api/shares.js'

/**
 * 用户数据上云（CloudBase 的 user_data 表）
 *
 * 形态：一台设备一行 —— device_id 是主键，payload 是一整包 JSON 快照。
 * payload 直接复用 data-backup-sheet 的导出结构，所以"本机导出"和"上云"是同一份东西。
 *
 * 身份：设备号在首启时生成一次、存本机，之后固定不变。它就是这台设备的身份，
 * 也当作读写云端数据的口令 —— 猜不到，所以别人读不到你那一行。
 * 表上的 RLS 策略会拿请求头 x-device 去比对 device_id，只放行自己那行。
 *
 * 现状：已写好但还没接进任何页面（要同步哪些数据由页面决定）；
 * 表建好之后要先实测两条（同设备号能读写 / 换设备号读不到）再接线。
 */

const TABLE = 'user_data'
const ID_KEY = 'deviceId'
const BASE = `https://${CLOUDBASE_ENV}.api.tcloudbasegateway.com/v1/rdb/rest/${TABLE}`

/** 128 位随机串；优先用平台随机源，取不到才退回 Math.random */
function randomHex(bytes) {
	const arr = new Uint8Array(bytes)
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		crypto.getRandomValues(arr)
	} else {
		for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
	}
	return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 本机设备号；没有就生成一个存下来 */
export function getDeviceId() {
	let id = ''
	try {
		id = uni.getStorageSync(ID_KEY) || ''
	} catch (e) { /* 读不到就当没生成过 */ }
	if (/^[a-f0-9]{32}$/.test(id)) return id
	id = randomHex(16)
	try {
		uni.setStorageSync(ID_KEY, id)
	} catch (e) { /* 存不下也只影响换机，不影响本次使用 */ }
	return id
}

/** 换机时把旧机的设备号填进来，就能接管那台机器的云端数据 */
export function setDeviceId(id) {
	const v = String(id || '').trim().toLowerCase()
	if (!/^[a-f0-9]{32}$/.test(v)) return false
	try {
		uni.setStorageSync(ID_KEY, v)
	} catch (e) {
		return false
	}
	return true
}

function authHeader(id) {
	return {
		apikey: CLOUDBASE_PUBLISHABLE_KEY,
		Authorization: `Bearer ${CLOUDBASE_PUBLISHABLE_KEY}`,
		'x-device': id
	}
}

/**
 * 上云：把整包数据写进这台设备那一行（没有就新建，有就覆盖）
 * @param {object} payload 与备份弹层导出结构一致的 JSON
 */
export function pushData(payload) {
	const id = getDeviceId()
	return request({
		url: `${BASE}?on_conflict=device_id`,
		method: 'POST',
		header: {
			...authHeader(id),
			'content-type': 'application/json',
			Prefer: 'resolution=merge-duplicates'
		},
		data: [{ device_id: id, payload }]
	})
}

/**
 * 下云：读回这台设备的整包数据
 * @returns {Promise<{payload: object, updatedAt: string}|null>} 云端没有就返回 null
 */
export function pullData() {
	const id = getDeviceId()
	return request({
		url: `${BASE}?device_id=eq.${id}&select=payload,updated_at`,
		header: authHeader(id)
	}).then((rows) => {
		const row = Array.isArray(rows) && rows.length ? rows[0] : null
		return row ? { payload: row.payload, updatedAt: row.updated_at } : null
	})
}
