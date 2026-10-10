<template>
	<text>{{ text }}</text>
</template>

<script setup>
import { computed } from 'vue'
import { nowTs } from '@/utils/ticker.js'
import { TIMER_STATUS } from '@/api/countdown.js'

// 倒计时卡片的剩余时间展示。单独成组件：运行中的计时器每秒只重渲染这一行文字，
// 不再让整页（含卡片列表、提示卡、弹层）跟着秒针重算。
// 类名由父级传（卡片用 timer-duration、弹层用 remain-text），样式仍走父页面的 scoped 规则。
const props = defineProps({
	timer: { type: Object, required: true }
})

function pad(n) {
	return String(n).padStart(2, '0')
}

function formatHMS(totalSec) {
	const s = Math.max(0, Math.floor(totalSec))
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

const text = computed(() => {
	const t = props.timer
	if (t.status === TIMER_STATUS.RUNNING) {
		return formatHMS(((t.startedAt || 0) + t.durationSeconds * 1000 - nowTs.value) / 1000)
	}
	return formatHMS(t.durationSeconds)
})
</script>
