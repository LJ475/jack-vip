<template>
	<view v-if="visible" class="as-wrap">
		<view class="as-mask" @click="close"></view>
		<view class="as-body">
			<view class="as-panel">
				<text class="as-title" v-if="title">{{ title }}</text>
				<view
					class="as-item"
					v-for="(it, i) in items"
					:key="i"
					@click="pick(i)"
				>
					<text class="as-item-text" :class="{ 'as-item-text--danger': it.danger }">{{ it.label }}</text>
				</view>
			</view>
			<view class="as-panel as-cancel" @click="close">
				<text class="as-item-text">取消</text>
			</view>
		</view>
	</view>
</template>

<script setup>
/**
 * 自带主题的底部选择单（替代 uni.showActionSheet）。
 * 为什么不用系统那个：App 端弹层的配色不跟我们的主题走（暗色下深底深字看不清），
 * 而 App 服务层又没有 document、挂不上 .theme-thought，只能用自己画的。
 */
const props = defineProps({
	visible: { type: Boolean, default: false },
	title: { type: String, default: '' },
	/** [{ label, danger }] */
	items: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'select'])

function close() {
	emit('close')
}

function pick(i) {
	emit('select', i)
	emit('close')
}
</script>

<style scoped>
	.as-wrap {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 1300;
	}

	.as-mask {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
	}

	.as-body {
		position: absolute;
		left: 24rpx;
		right: 24rpx;
		bottom: calc(env(safe-area-inset-bottom) + 24rpx);
	}

	.as-panel {
		background: #ffffff;
		border-radius: 28rpx;
		overflow: hidden;
	}

	.theme-thought .as-panel {
		background: #1A1A1F;
		border: 1rpx solid #2A2A32;
	}

	.as-title {
		display: block;
		text-align: center;
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
		padding: 24rpx 0 4rpx;
	}

	.as-item {
		padding: 30rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.as-item + .as-item {
		border-top: 1rpx solid var(--divider);
	}

	.as-item-text {
		font-size: 30rpx;
		color: var(--text);
	}

	.as-item-text--danger {
		color: var(--danger);
	}

	.as-cancel {
		margin-top: 16rpx;
	}
</style>
