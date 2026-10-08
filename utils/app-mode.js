import { CONTENT_MODE } from '../api/shares.js'

/**
 * 全局内容模式（主题跟着走）：
 *   - 专属会员分享 → 蓝色主题（默认）
 *   - 365天思考实验 → 黑色主题
 * 借 storage 在两个页面间共享（TabBar 用 reLaunch 切页，onShow 时重读）；
 * App 冷启动时由 App.vue 调 resetAppMode() 回到默认的专属会员分享。
 */
const MODE_KEY = 'lastContentMode'

/** 当前内容模式；无记录/非法值一律回落专属会员分享 */
export function getAppMode() {
	const m = uni.getStorageSync(MODE_KEY)
	return m === CONTENT_MODE.THOUGHT ? CONTENT_MODE.THOUGHT : CONTENT_MODE.IMAGE
}

export function setAppMode(mode) {
	uni.setStorageSync(MODE_KEY, mode)
}

/** 冷启动重置：清除上次会话遗留的模式选择 */
export function resetAppMode() {
	try {
		uni.removeStorageSync(MODE_KEY)
	} catch (e) { /* 忽略 */ }
}

/** 状态栏文字颜色跟随主题（黑主题用浅色文字）；仅 App 端生效 */
export function syncStatusBarTheme(mode) {
	// #ifdef APP-PLUS
	try {
		plus.navigator.setStatusBarStyle(mode === CONTENT_MODE.THOUGHT ? 'light' : 'dark')
	} catch (e) { /* 忽略 */ }
	// #endif
}

/** 根节点主题类：H5 下把 .theme-thought 挂到 html 上，
 *  供滚动条、overscroll 底色等「页面元素之外」的部分跟随主题 */
export function syncRootTheme(mode) {
	// #ifdef H5
	try {
		document.documentElement.classList.toggle('theme-thought',
			mode === CONTENT_MODE.THOUGHT)
	} catch (e) { /* 忽略 */ }
	// #endif
}
