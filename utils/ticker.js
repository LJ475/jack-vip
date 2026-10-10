import { ref } from 'vue'

/**
 * 全局秒级时钟。
 * 只有需要跟着秒跳的叶子组件依赖它——页面级的渲染 effect 不再每秒被触发，
 * App 端因此不必每秒把整页 vnode 重算一遍并跨逻辑层↔视图层通讯。
 * 启停按订阅数计数：可见页面各自订阅，最后一个订阅者退订才真正清 interval，
 * 这样 tab 页切走不会让还在显示的页面失去时钟。
 */
export const nowTs = ref(Date.now())

let timer = null
let subs = 0

export function subscribeClock() {
	subs++
	if (timer) return
	nowTs.value = Date.now()
	timer = setInterval(() => {
		nowTs.value = Date.now()
	}, 1000)
}

export function unsubscribeClock() {
	subs = Math.max(0, subs - 1)
	if (subs === 0 && timer) {
		clearInterval(timer)
		timer = null
	}
}
