<template>
	<view class="anb" :class="'anb--' + align">
		<view class="anb-back" v-if="showBack" @click="onBack">
			<uni-icons type="left" :size="align === 'left' ? 22 : 20" color="var(--text)" />
		</view>
		<view class="anb-main">
			<!-- 默认渲染标题；页面想放别的（分段胶囊等）就用默认插槽覆盖 -->
			<slot>
				<text class="anb-title">{{ title }}</text>
			</slot>
		</view>
		<view class="anb-right">
			<slot name="right"></slot>
		</view>
	</view>
</template>

<script setup>
/**
 * 二级页统一顶部导航：返回 + 内容（标题或默认插槽）+ 右侧插槽。
 * 返回逻辑收在这里：能回退就回退，被直接打开时兜底回 backTo（默认「我的」）。
 */
const props = defineProps({
	title: { type: String, default: '' },
	showBack: { type: Boolean, default: true },
	/** left = 箭头 + 标题紧挨着左对齐（他给的参照图形态）；center = 标题居中 */
	align: { type: String, default: 'left' },
	/** 没有上一页时的兜底目的地，必须是 tab 页 */
	backTo: { type: String, default: '/pages/mine/index' }
})

function onBack() {
	const pages = getCurrentPages()
	if (pages.length > 1) uni.navigateBack()
	else uni.switchTab({ url: props.backTo })
}
</script>

<style scoped>
	.anb {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.anb-back {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: -14rpx;
		flex-shrink: 0;
	}

	.anb-main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	.anb--center .anb-main {
		justify-content: center;
	}

	.anb-title {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
		margin-left: 6rpx;
	}

	.anb--center .anb-title {
		font-size: 34rpx;
		font-weight: 600;
		margin-left: 0;
	}

	.anb-right {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
</style>
