import { ref } from 'vue'

/**
 * 阅读字号（只影响正文与次要说明，不碰标题/大数字/按钮/导航）。
 * 原理：所有 ≤28rpx 的正文类字号都写成 calc(Nrpx * var(--fs, 1))，
 * 页面根节点挂 --fs；H5 另外在 html 上也挂一份，这样 uni 挂到页面外的弹层也能吃到。
 */
const KEY = 'fontScale'

export const SCALES = [
	{ key: 'small', label: '小', factor: 0.9 },
	{ key: 'standard', label: '标准', factor: 1 },
	{ key: 'large', label: '大', factor: 1.15 }
]

export function getFontScaleKey() {
	let k = ''
	try { k = uni.getStorageSync(KEY) || '' } catch (e) { /* 忽略 */ }
	return SCALES.some((s) => s.key === k) ? k : 'standard'
}

export function setFontScaleKey(k) {
	try { uni.setStorageSync(KEY, k) } catch (e) { /* 忽略 */ }
}

export function fontScaleLabel(k = getFontScaleKey()) {
	const hit = SCALES.find((s) => s.key === k)
	return hit ? hit.label : '标准'
}

export function fontScaleFactor(k = getFontScaleKey()) {
	const hit = SCALES.find((s) => s.key === k)
	return hit ? hit.factor : 1
}

/** 页面根用 :style="{ '--fs': fsVar }" 绑它 */
export const fsVar = ref(String(fontScaleFactor()))

/** 每个页面 onShow 调一次：重读档位，并顺带把 H5 的根变量也刷了 */
export function refreshFontScale() {
	fsVar.value = String(fontScaleFactor())
	// #ifdef H5
	try {
		document.documentElement.style.setProperty('--fs', fsVar.value)
	} catch (e) { /* 忽略 */ }
	// #endif
}
