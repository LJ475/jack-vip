/**
 * 设备尺寸适配（不同屏幕宽 / 高 / 横竖屏）。
 *
 * 分工：**CSS 媒体查询是主力** —— App 的页面跑在 webview 里，媒体查询跟 H5 一样准，
 * 而且转屏、改窗口大小都由浏览器自己重算，不闪屏、不依赖 JS 时序；
 * 这个模块只补 CSS 拿不到的两件事：
 *   1. H5 移动端浏览器的「真实可视高度」——地址栏收放时 100vh 会偏大，用 --vh 修；
 *   2. 需要按尺寸算数的地方（getDeviceProfile / rpx2px）一份统一的档位判断。
 *
 * 档位（断点与 App.vue 里 --adapt-* 变量一一对应，改一处要一起改）：
 *   宽：small < 360 ≤ standard < 480 ≤ large < 600 ≤ tablet < 900 ≤ desktop
 *   高：short < 640 ≤ normal < 820 ≤ tall
 * 宽屏（> 560px 设计宽）内容列封顶居中，见 App.vue 的设备适配段。
 */

export const ADAPT = {
	/**
	 * 内容列封顶宽（px）。与 App.vue 里 rpx 基准封顶的 23.8933px 是同一个设计宽
	 * （560 / 23.4375 = 23.8933，1rem = 32rpx 是 uni 编译器的换算比）。
	 */
	contentMaxWidth: 560,
	/** 小屏上限（5.0" 及以下、小折叠外屏） */
	smallMax: 359,
	/** 大屏手机 / 折叠屏展开 */
	largeMin: 480,
	/** 平板 */
	tabletMin: 600,
	/** 桌面 H5 / 平板横屏 */
	desktopMin: 900,
	/** 矮屏（横屏手机、小屏机）上限 */
	shortMaxHeight: 639,
	/** 高屏 */
	tallMinHeight: 820,
	/** 750rpx 设计稿 → rem 的换算基数（uni 编译器：1rem = 32rpx） */
	rpxPerRem: 32
}

/** 缓存：同一次尺寸下反复取用不再跨桥读系统信息；尺寸变了（syncViewportVars）会失效 */
let cached = null

/** 安全区（刘海 / 小白条）四边内边距，px */
function readInsets(info) {
	const screenH = info.screenHeight || info.windowHeight || 0
	const screenW = info.screenWidth || info.windowWidth || 0
	const sa = info.safeArea
	if (!sa) {
		return { top: Math.round(info.statusBarHeight || 0), bottom: 0, left: 0, right: 0 }
	}
	const num = (v, d) => (typeof v === 'number' && v >= 0 ? Math.round(v) : d)
	return {
		top: num(sa.top, Math.round(info.statusBarHeight || 0)),
		bottom: num(screenH - (sa.bottom || screenH), 0),
		left: num(sa.left, 0),
		right: num(screenW - (sa.right || screenW), 0)
	}
}

/**
 * 当前设备的尺寸画像（缓存）。
 * 拿不到系统信息时按最常见的 375×667 手机兜底，绝不抛错。
 */
export function getDeviceProfile() {
	if (cached) return cached
	let info = {}
	try {
		info = uni.getSystemInfoSync() || {}
	} catch (e) {
		info = {}
	}
	const width = Math.round(info.windowWidth || info.screenWidth || 375)
	const height = Math.round(info.windowHeight || info.screenHeight || 667)
	const tier = width <= ADAPT.smallMax
		? 'small'
		: width < ADAPT.largeMin
			? 'standard'
			: width < ADAPT.tabletMin
				? 'large'
				: width < ADAPT.desktopMin
					? 'tablet'
					: 'desktop'
	const heightTier = height <= ADAPT.shortMaxHeight ? 'short' : height < ADAPT.tallMinHeight ? 'normal' : 'tall'
	const deviceType = info.deviceType || ''
	cached = {
		width,
		height,
		screenWidth: Math.round(info.screenWidth || width),
		screenHeight: Math.round(info.screenHeight || height),
		statusBarHeight: Math.round(info.statusBarHeight || 0),
		insets: readInsets(info),
		tier,
		heightTier,
		deviceType,
		platform: info.platform || '',
		pixelRatio: info.pixelRatio || 1,
		/** 小屏（< 360px） */
		isSmall: tier === 'small',
		/** 宽屏（≥ 600px）：平板 / 折叠屏展开 / 桌面 H5 */
		isWide: width >= ADAPT.tabletMin,
		isTablet: tier === 'tablet',
		isDesktop: tier === 'desktop',
		/** 横屏 */
		isLandscape: width > height,
		/** 矮屏（< 640px 高）：横屏手机、小屏机 */
		isShort: heightTier === 'short',
		isPad: deviceType === 'pad',
		/** 内容列封顶宽（px），与 App.vue 的 --adapt-content-max 同值 */
		contentMaxWidth: ADAPT.contentMaxWidth
	}
	return cached
}

/**
 * rpx → px，按「封顶后」的换算基准算（大屏不再等比放大）。
 * 需要按屏幕尺寸自己算像素的地方用它，别再用固定的 0.5（那是 375px 设计宽的假设）。
 */
export function rpx2px(n) {
	const p = getDeviceProfile()
	const base = Math.min(p.width, ADAPT.contentMaxWidth)
	return ((Number(n) || 0) * base) / 750
}

/**
 * 刷新尺寸变量与档位类：
 *   - H5：给 html 挂 --vh / --vw（真实可视高度，修地址栏收放导致的 100vh 偏大）
 *     与 dev-* 档位类（给挂在页面元素之外的弹层用）；App 端没有 document，整段是空操作。
 *   - 两个端都会让尺寸画像缓存失效，下一次 getDeviceProfile() 重新读。
 */
export function syncViewportVars() {
	cached = null
	// #ifdef H5
	try {
		const root = document.documentElement
		const h = window.innerHeight || 0
		const w = window.innerWidth || 0
		if (h) root.style.setProperty('--vh', h / 100 + 'px')
		if (w) root.style.setProperty('--vw', w / 100 + 'px')
		const p = getDeviceProfile()
		root.classList.toggle('dev-small', p.isSmall)
		root.classList.toggle('dev-wide', p.isWide)
		root.classList.toggle('dev-tablet', p.isTablet)
		root.classList.toggle('dev-desktop', p.isDesktop)
		root.classList.toggle('dev-landscape', p.isLandscape)
		root.classList.toggle('dev-short', p.isShort)
	} catch (e) { /* 拿不到就退化成纯 CSS 媒体查询，不影响功能 */ }
	// #endif
}

let inited = false

/** App.vue 的 onLaunch / onShow 调它：刷一次尺寸变量，并挂上尺寸变化监听（只挂一次） */
export function initDeviceAdapt() {
	syncViewportVars()
	if (inited) return
	inited = true
	try {
		// 转屏 / 改窗口大小：重算档位（App 端转屏、H5 端拉窗口都会触发）
		uni.onWindowResize(() => syncViewportVars())
	} catch (e) { /* 老版本没有这个 API，退化成只在进出页面时刷新 */ }
}
