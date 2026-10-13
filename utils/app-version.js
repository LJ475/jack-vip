/**
 * App 版本号。
 *
 * 为什么不写死：App 端版本号由 uni 从 manifest.json 的 versionName 读出来，
 * 以后升版本只改 manifest.json 一处，这里不用跟着动。
 * H5 / 开发环境拿不到运行时版本，才回退到下面的常量。
 *
 * 用途：用户报问题时能直接念出来（「我的 → 最下面」点一下还能复制）。
 */

/** 只在拿不到运行时版本时用（H5 预览、开发环境） */
const FALLBACK = '1.0.0'

export function appVersion() {
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
			return String(plus.runtime.version)
		}
	} catch (e) { /* 拿不到就往下走 */ }
	// #endif
	try {
		const info = uni.getSystemInfoSync()
		if (info && info.appVersion) return String(info.appVersion)
	} catch (e) { /* 拿不到就用常量 */ }
	return FALLBACK
}

export function appVersionText() {
	return 'v' + appVersion()
}
