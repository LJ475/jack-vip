<template>
	<view class="viewer" v-if="visible">
		<view class="viewer-top">
			<text class="viewer-date">{{ dateText }}</text>
			<text class="viewer-count" v-if="items.length > 1">{{ cur + 1 }} / {{ items.length }}</text>
			<view class="viewer-close" @click="close">
				<uni-icons type="closeempty" size="24" color="#FFFFFF" />
			</view>
		</view>

		<swiper class="viewer-swiper" :current="cur" :indicator-dots="false" @change="onChange">
			<swiper-item v-for="(it, i) in items" :key="i">
				<!-- 只挂当前页前后各一张：整月 30 张 1440x2160 全解码会直接把帧率拖死 -->
				<image
					v-if="near(i)"
					class="viewer-img"
					:src="it.image_url"
					mode="aspectFit"
					lazy-load
					@longpress="save(it)"
				/>
				<view v-else class="viewer-ph"></view>
			</swiper-item>
		</swiper>

		<text class="viewer-hint">左右滑动看前后几天 · 长按图片保存到相册</text>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { saveImageToAlbum } from '@/utils/save-image.js'

const props = defineProps({
	visible: { type: Boolean, default: false },
	items: { type: Array, default: () => [] },
	index: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])

const cur = ref(0)
watch(() => props.index, (v) => { cur.value = v || 0 })

const current = computed(() => props.items[cur.value] || null)

/** 顶部日期：跟随当前这张图，格式与详情弹层一致 */
const dateText = computed(() => {
	const it = current.value
	if (!it) return ''
	const date = it.share_date || ''
	const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date)
	let text = m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : date
	if (it.created_at && it.created_at.length >= 16) {
		text += ` ${it.created_at.slice(11, 16)}`
	}
	return text
})

function onChange(e) {
	cur.value = (e && e.detail && e.detail.current) || 0
}

/** 只渲染离当前页 1 页以内的图，其余留占位块 */
function near(i) {
	return Math.abs(i - cur.value) <= 1
}

function close() {
	emit('close')
}

function save(it) {
	const url = it && it.image_url
	if (!url) return
	saveImageToAlbum(url).catch(() => { /* 提示已在工具内给出 */ })
}
</script>

<style scoped>
	/* 灯箱一律深底：两种主题下看图都靠这个，避免浅色底把图片边框吃掉 */
	.viewer {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 2000;
		background: rgba(8, 8, 10, 0.96);
		display: flex;
		flex-direction: column;
	}

	.viewer-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: calc(var(--status-bar-height, 0px) + 24rpx) 28rpx 20rpx;
	}

	.viewer-date {
		font-size: 28rpx;
		font-weight: 600;
		color: #FFFFFF;
	}

	.viewer-count {
		margin-left: 16rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.55);
	}

	.viewer-close {
		margin-left: auto;
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.viewer-swiper {
		flex: 1;
		height: 0;
	}

	.viewer-img {
		width: 100%;
		height: 100%;
	}

	/* 未挂载的页留空占位，保证 swiper 每页宽度一致、滑动距离不跳 */
	.viewer-ph {
		width: 100%;
		height: 100%;
	}

	.viewer-hint {
		padding: 20rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.45);
		text-align: center;
	}
</style>
