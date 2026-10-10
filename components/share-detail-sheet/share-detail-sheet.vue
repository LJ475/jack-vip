<template>
	<view v-if="visible && share">
		<view class="sheet-mask" @click="close"></view>
		<view class="sheet">
			<view class="sheet-inner glassmorphism glass-sheet">
				<view class="vibrancy-effect"></view>
				<view class="sheet-head">
					<text class="sheet-title">{{ sheetTitle }}</text>
					<view class="sheet-close" @click="close">
						<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
					</view>
				</view>
				<scroll-view scroll-y class="sheet-body">
					<view class="detail-wrap">
						<!-- 大图：点击进入全屏预览，App 端长按可保存到相册 -->
						<image
							class="detail-img"
							:src="share.image_url"
							mode="widthFix"
							@click="previewImage"
						/>
						<text class="detail-caption" v-if="share.caption">{{ share.caption }}</text>

						<view class="detail-meta">
							<view class="tag tag-primary" v-if="share.source_name">{{ share.source_name }}</view>
							<text class="detail-date">{{ detailDateText }}</text>
						</view>

						<!-- 保存到相册（网络图先下载、本地图带安卓兼容兜底，逻辑在 utils/save-image.js） -->
						<button
							class="btn btn-primary full-btn detail-save-btn"
							v-if="share.image_url"
							@click="saveImage"
						>保存图片到相册</button>

						<!-- 内容缺失提示 -->
						<view class="detail-missing" v-if="!share.image_url">
							<text class="detail-missing-text">这条分享的图片暂时无法加载</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { saveImageToAlbum } from '@/utils/save-image.js'

const props = defineProps({
	visible: { type: Boolean, default: false },
	share: { type: Object, default: null }
})

const emit = defineEmits(['close', 'preview'])

const isThought = computed(() => props.share && props.share.mode === 'thought')

/** 弹层标题：跟内容类型走 */
const sheetTitle = computed(() => (isThought.value ? '365天思考实验' : '分享详情'))

function close() {
	emit('close')
}

const detailDateText = computed(() => {
	const share = props.share
	if (!share) return ''
	const date = share.share_date || ''
	const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date)
	let text = m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : date
	if (share.created_at && share.created_at.length >= 16) {
		text += ` ${share.created_at.slice(11, 16)}`
	}
	return text
})

function previewImage() {
	const url = props.share && props.share.image_url
	if (!url) return
	// 交给页面打开全屏预览层（要拿当月内容才能左右跨天滑），
	// H5 下弹层蒙层与全屏预览层叠加会互相干扰，所以由页面先关弹层
	emit('preview', props.share)
}

function saveImage() {
	const url = props.share && props.share.image_url
	if (!url) return
	saveImageToAlbum(url).catch(() => { /* 提示已在工具内给出 */ })
}
</script>

<style scoped>
	/* 外层负责定位与蒙层，内层挂 .glassmorphism glass-sheet（UI 文档 3.8） */
	.sheet-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
		z-index: 999;
		animation: sheet-mask-in 0.25s ease both;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		max-height: 85vh;
		padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.sheet-inner {
		display: flex;
		flex-direction: column;
		max-height: calc(85vh - 24rpx - env(safe-area-inset-bottom));
		animation: sheet-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 28rpx 16rpx;
		position: relative;
		z-index: 1;
	}

	.sheet-title {
		font-size: 32rpx;
		font-weight: 600;
		color: var(--text);
	}

	.sheet-close {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sheet-body {
		flex: 1;
		max-height: 60vh;
		position: relative;
		z-index: 1;
	}

	@keyframes sheet-mask-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes sheet-up {
		from {
			opacity: 0;
			transform: translateY(60rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ===== 详情内容（仅布局与排版） ===== */
	.detail-wrap {
		padding: 8rpx 28rpx 32rpx;
		box-sizing: border-box;
	}

	.detail-img {
		width: 100%;
		border-radius: var(--radius-md);
		background: var(--brand-light);
		display: block;
	}

	.detail-caption {
		display: block;
		margin-top: 24rpx;
		font-size: 28rpx;
		color: var(--text);
		line-height: 1.7;
	}

	.detail-meta {
		display: flex;
		align-items: center;
		margin-top: 24rpx;
	}

	.detail-date {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-left: 16rpx;
	}

	.detail-save-btn {
		margin-top: 28rpx;
	}

	.detail-missing {
		padding: 40rpx 0;
	}

	.detail-missing-text {
		font-size: 26rpx;
		color: var(--text-aux);
	}
</style>
