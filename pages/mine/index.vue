<template>
	<view class="page page-tabbar mine-page" :class="{ 'theme-thought': isThoughtTheme }">
		<view class="mine-head">
			<text class="mine-title">我的</text>
			<text class="mine-sub">这里的入口都指向本机功能，数据只存在这台设备</text>
		</view>

		<view class="entry-card">
			<view class="entry-row" @click="goGoals">
				<view class="entry-icon entry-icon--blue">
					<uni-icons type="star-filled" size="20" color="#3A83F7" />
				</view>
				<view class="entry-main">
					<text class="entry-title">2030 目标</text>
					<text class="entry-desc">长期目标 · 每日打卡 · 里程碑与记录</text>
				</view>
				<uni-icons type="right" size="14" color="var(--text-weak)" />
			</view>

			<view class="entry-row" @click="goWork">
				<view class="entry-icon entry-icon--gold">
					<uni-icons type="notification-filled" size="20" color="#F0B23E" />
				</view>
				<view class="entry-main">
					<text class="entry-title">干正事</text>
					<text class="entry-desc">倒计时 · 系统闹钟到点响铃</text>
				</view>
				<uni-icons type="right" size="14" color="var(--text-weak)" />
			</view>
		</view>

		<text class="mine-foot">格式：本机存储 · 无账号 · 无云同步</text>

		<!-- 底部导航（我的为第二项） -->
		<app-tab-bar :current="1" />
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme, hideNativeTabBar } from '@/utils/app-mode.js'

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

function goGoals() {
	uni.navigateTo({ url: '/pages/goals/index' })
}

function goWork() {
	uni.navigateTo({ url: '/pages/work/index' })
}

onShow(() => {
	hideNativeTabBar()
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
})
</script>

<style scoped>
	.mine-page {
		/* 底色走变量：scoped 选择器优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--mine-bg: linear-gradient(135deg, #edf4ff, #f8fbff);
		min-height: 100vh;
		background: var(--mine-bg);
	}

	.mine-page.theme-thought {
		--mine-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
	}

	.mine-head {
		padding: 24rpx 8rpx 32rpx;
	}

	.mine-title {
		display: block;
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
	}

	.mine-sub {
		display: block;
		font-size: 22rpx;
		color: var(--text-aux);
		margin-top: 10rpx;
	}

	.entry-card {
		background: rgba(255, 255, 255, 0.72);
		border: 1rpx solid rgba(255, 255, 255, 0.7);
		border-radius: 32rpx;
		box-shadow: 0 8rpx 32rpx rgba(31, 45, 61, 0.12);
		overflow: hidden;
	}

	.theme-thought .entry-card {
		background: rgba(20, 20, 25, 0.92);
		border-color: #2A2A32;
		border-radius: 52rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.35),
			inset 0 1rpx 0 rgba(255, 240, 200, 0.12);
	}

	.entry-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 30rpx 28rpx;
	}

	.entry-row + .entry-row {
		border-top: 1rpx solid var(--divider);
	}

	.entry-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.entry-icon--blue {
		background: rgba(58, 131, 247, 0.14);
	}

	.entry-icon--gold {
		background: rgba(240, 178, 62, 0.16);
	}

	.entry-main {
		flex: 1;
		margin: 0 20rpx 0 20rpx;
		min-width: 0;
	}

	.entry-title {
		display: block;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.entry-desc {
		display: block;
		font-size: 23rpx;
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	.mine-foot {
		display: block;
		text-align: center;
		font-size: 20rpx;
		color: var(--text-weak);
		margin-top: 32rpx;
	}
</style>
