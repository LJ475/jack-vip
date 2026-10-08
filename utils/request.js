/**
 * 统一请求封装
 *
 * options.url 支持三种写法：
 *   1. 绝对地址（http/https 开头）：直接请求（COS 清单、CloudBase REST 等）；
 *   2. 根相对地址（/ 开头）：按原样请求——H5 下走同源（如部署站点的同源清单）；
 *   3. 其他相对路径：拼在 BASE_URL 后，用于自建后端。
 */
export const BASE_URL = 'http://localhost:8080' // 当前未使用（项目内均为绝对地址请求），保留给将来自建后端

const REQUEST_TIMEOUT = 15000

/**
 * @param {object} options
 * @param {string} options.url    接口地址（绝对 / 根相对 / 相对）
 * @param {string} [options.method] 默认 GET
 * @param {object} [options.data]  查询参数（GET）或请求体（POST）
 * @param {object} [options.header] 额外请求头
 * @returns {Promise<any>} 2xx 时返回响应 JSON
 */
export function request(options) {
	const target = /^(https?:\/\/|\/)/i.test(options.url)
		? options.url
		: BASE_URL + options.url

	return new Promise((resolve, reject) => {
		uni.request({
			url: target,
			method: options.method || 'GET',
			data: options.data || {},
			timeout: REQUEST_TIMEOUT,
			header: options.header || {},
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data)
				} else {
					// statusCode 挂在错误对象上，供调用方区分 404（未上传/不存在）等场景
					const err = new Error(`请求失败（${res.statusCode}）`)
					err.statusCode = res.statusCode
					reject(err)
				}
			},
			fail: (err) => {
				reject(new Error((err && err.errMsg) || '网络连接失败'))
			}
		})
	})
}
