<template>
	<text>{{ text }}</text>
</template>

<script setup>
import { computed } from 'vue'
import { nowTs } from '@/utils/ticker.js'

// 2030 总览卡的「时:分:秒」跳动。单独成组件是为了让每秒的变化只重渲染这一个节点，
// 而不是整页；类名由父级传（class="days-tick"），样式仍随父页面的 scoped 规则生效。
const props = defineProps({
	endTs: { type: Number, required: true }
})

function pad(n) {
	return String(n).padStart(2, '0')
}

const text = computed(() => {
	let remain = Math.max(0, props.endTs - nowTs.value)
	const days = Math.floor(remain / 86400000)
	remain -= days * 86400000
	const h = Math.floor(remain / 3600000)
	const m = Math.floor((remain % 3600000) / 60000)
	const s = Math.floor((remain % 60000) / 1000)
	return `${pad(h)}:${pad(m)}:${pad(s)}`
})
</script>
