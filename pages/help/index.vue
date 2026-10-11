<template>
	<view class="help-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<app-nav-bar title="帮助与反馈" />

		<!-- 联系我：微信搜索加好友 -->
		<view class="hp-card">
			<view class="hp-head">
				<uni-icons type="weixin" size="22" color="#27C68A" />
				<text class="hp-title">微信找我</text>
			</view>
			<text class="hp-desc">用微信搜索下面这串号加我。问题、建议、哪里不好用，直接发给我就行。</text>
			<view class="hp-id-box">
				<text class="hp-id">LforovW13</text>
				<view class="hp-copy" @click="copyWechat">
					<uni-icons type="paperclip" size="15" color="var(--brand)" />
					<text class="hp-copy-text">复制</text>
				</view>
			</view>
			<text class="hp-tip">加的时候备注一下「App」，我好通过。</text>
		</view>

		<text class="hp-foot">如果是数据相关的问题，先在「我的 → 备份与恢复」里导出一份，方便我帮你查</text>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'

const WECHAT_ID = 'LforovW13'

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

function copyWechat() {
	uni.setClipboardData({
		data: WECHAT_ID,
		success: () => {
			uni.showToast({ title: '微信号已复制', icon: 'none' })
		},
		fail: () => {
			uni.showToast({ title: '复制失败，手动记一下', icon: 'none' })
		}
	})
}

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
})
</script>

<style scoped>
	.help-page {
		/* 底色走变量：scoped 优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--hp-bg: linear-gradient(160deg, #eaf2ff 0%, #f7fbff 60%, #ffffff 100%);
		--hp-card: #ffffff;
		--hp-card-border: rgba(255, 255, 255, 0.9);
		--hp-id-bg: #f2f7ff;
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 12rpx) 24rpx calc(env(safe-area-inset-bottom) + 32rpx);
		background: var(--hp-bg);
	}

	.help-page.theme-thought {
		--hp-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
		--hp-card: rgba(20, 20, 25, 0.92);
		--hp-card-border: #2A2A32;
		--hp-id-bg: rgba(255, 255, 255, 0.05);
	}

	.hp-card {
		background: var(--hp-card);
		border: 1rpx solid var(--hp-card-border);
		border-radius: 32rpx;
		padding: 30rpx 28rpx;
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .hp-card {
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
	}

	.hp-head {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.hp-title {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--text);
		margin-left: 12rpx;
	}

	.hp-desc {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-secondary);
		line-height: 1.7;
		margin-top: 16rpx;
	}

	.hp-id-box {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		background: var(--hp-id-bg);
		border-radius: 20rpx;
		padding: 22rpx 24rpx;
		margin-top: 22rpx;
	}

	.hp-id {
		font-size: 34rpx;
		font-weight: 600;
		color: var(--text);
		letter-spacing: 2rpx;
	}

	.hp-copy {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 56rpx;
		padding: 0 22rpx;
		border-radius: 999rpx;
		background: var(--btn-ghost-bg);
		border: 1rpx solid var(--border-soft);
	}

	.hp-copy-text {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--brand);
		margin-left: 8rpx;
	}

	.hp-tip {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
		margin-top: 16rpx;
	}

	.hp-foot {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
		line-height: 1.7;
		margin: 28rpx 6rpx 0;
	}
</style>
