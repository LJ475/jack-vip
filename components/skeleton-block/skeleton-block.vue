<template>
	<view class="sk" :class="{ 'sk--circle': circle }" :style="style"></view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	w: { type: String, default: '100%' },
	h: { type: String, default: '28rpx' },
	r: { type: String, default: '12rpx' },
	circle: { type: Boolean, default: false },
	mt: { type: String, default: '0' }
})

const style = computed(() => {
	const s = `width:${props.w};height:${props.h};margin-top:${props.mt};`
	return props.circle ? s + 'border-radius:50%;' : s + `border-radius:${props.r};`
})
</script>

<style scoped>
.sk {
	background-image: linear-gradient(
		90deg,
		var(--sk-base) 25%,
		var(--sk-hi) 37%,
		var(--sk-base) 63%
	);
	background-size: 400% 100%;
	animation: sk-shimmer 1.4s ease-in-out infinite;
}

@keyframes sk-shimmer {
	from { background-position: 100% 50%; }
	to { background-position: 0 50%; }
}

@media (prefers-reduced-motion: reduce) {
	.sk { animation: none; }
}
</style>
