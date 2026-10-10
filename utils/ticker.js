import { ref } from 'vue'

/**
 * 全局秒级时钟。
 * 只有需要跟着秒跳的叶子组件依赖它——页面级的渲染 effect 不再每秒被触发，
 * App 端因此不必每秒把整页 vnode 重算一遍并跨逻辑层↔视图层通讯。
 *
 * 启停按「哪个页面可见」记账：订阅用页面名做键，重复订阅/重复取消都是幂等的。
 * 早期版本用的是计数器，被重复触发的 onHide 打穿过一次——那次计数归零把仍在显示的
 * 页面的时钟关掉了，页面上的秒表就停在最后一秒不动。用 Set 就没有这个问题。
 */
export const nowTs = ref(Date.now())

const visiblePages = new Set()
let timer = null

function tick() {
	nowTs.value = Date.now()
}

export function subscribeClock(page) {
	visiblePages.add(page || 'unknown')
	if (!timer) {
		nowTs.value = Date.now()
		timer = setInterval(tick, 1000)
	}
}

export function unsubscribeClock(page) {
	visiblePages.delete(page || 'unknown')
	if (!visiblePages.size && timer) {
		clearInterval(timer)
		timer = null
	}
}
