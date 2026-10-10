import { CONTENT_MODE } from '../api/shares.js'

/**
 * 全局内容模式（主题跟着走）：
 *   - 专属会员分享 → 蓝色主题（默认）
 *   - 365天思考实验 → 黑色主题
 * 借 storage 在两个页面间共享（TabBar 用 switchTab 切页，页面缓存但 onShow 每次都会触发，进来时重读）；
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

/** 状态栏文字颜色 + 页面窗口层底色跟随主题；仅 App 端生效 */
export function syncStatusBarTheme(mode) {
	// #ifdef APP-PLUS
	const thought = mode === CONTENT_MODE.THOUGHT
	try {
		plus.navigator.setStatusBarStyle(thought ? 'light' : 'dark')
	} catch (e) { /* 忽略 */ }
	// App 端最先画的是页面 webview 的原生窗口底色，它只认 pages.json 里那个静态 backgroundColor
	// （两个主题共用不了）；暗色下这层还是浅蓝，切页/回前台就闪白。H5 端同类问题靠
	// html.theme-thought 覆盖 CSS 解决，但 App 的服务层没有 document，那套类挂不上去，只能走原生。
	// 键名与 uni 自己处理 darkmode 时 setStyle 的那几个保持一致（uni-app-plus 运行时 useWebviewThemeChange）。
	try {
		const pages = getCurrentPages()
		const page = pages[pages.length - 1]
		const wv = page && page.$getAppWebview && page.$getAppWebview()
		if (wv) {
			const bg = thought ? '#0B0B0F' : '#EDF4FF'
			wv.setStyle({
				background: bg,
				backgroundColorTop: bg,
				backgroundColorBottom: bg,
				animationAlphaBGColor: bg
			})
		}
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
