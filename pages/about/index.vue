<template>
	<view class="about-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<!-- 顶部：返回 + 分段胶囊 -->
		<view class="ab-head">
			<view class="ab-back" @click="goBack">
				<uni-icons type="left" size="22" color="var(--text)" />
			</view>
			<view class="ab-seg">
				<view class="ab-seg-item" :class="{ active: tab === 'me' }" @click="switchTab('me')">
					<text class="ab-seg-text">关于我</text>
				</view>
				<view class="ab-seg-item" :class="{ active: tab === 'thanks' }" @click="switchTab('thanks')">
					<text class="ab-seg-text">支持记录</text>
				</view>
			</view>
		</view>

		<!-- ===== 关于我 ===== -->
		<template v-if="tab === 'me'">
			<view class="ab-hero">
				<image class="ab-avatar" src="/static/logo.png" mode="aspectFill" />
				<text class="ab-name">jack会员分享</text>
				<text class="ab-slogan">每天一张值得收藏的分享图</text>
				<view class="ab-divider">
					<view class="ab-line"></view>
					<text class="ab-divider-text">记录生活 · 分享美好</text>
					<view class="ab-line"></view>
				</view>
			</view>

			<!-- 抖音卡片：二维码是项目里的本地图，点图放大、可存相册 -->
			<view class="ab-dy">
				<view class="ab-dy-head">
					<uni-icons type="videocam-filled" size="20" color="#FFFFFF" />
					<text class="ab-dy-title">抖音</text>
				</view>
				<text class="ab-dy-sub">记录生活中的美好瞬间</text>
				<text class="ab-dy-sub">感谢每一个喜欢我作品的你</text>
				<view class="ab-qr-wrap" @click="previewQr(MY_QR)">
					<image class="ab-qr" :src="MY_QR" mode="widthFix" />
				</view>
				<text class="ab-dy-hint">点二维码放大 · 保存后可到抖音「扫一扫」从相册识别</text>
				<button class="btn btn-primary full-btn ab-save-btn" @click="saveQr(MY_QR)">保存到相册</button>
			</view>

			<!-- 每日更新提醒（仅 App 端；本地通知不支持按日重复，靠打开 App 自动续期） -->
			<!-- #ifdef APP-PLUS -->
			<view class="ab-card">
				<view class="ab-row-head">
					<uni-icons type="notification" size="15" color="var(--brand)" />
					<text class="ab-row-head-text">每日更新提醒</text>
				</view>
				<view class="ab-row">
					<text class="ab-row-label">每天提醒我来看新分享</text>
					<switch class="ab-row-switch" :checked="reminderOn" color="var(--brand)" @change="onReminderToggle" />
				</view>
				<picker mode="time" :value="reminderTime" :disabled="!reminderOn" @change="onReminderTimeChange">
					<view class="ab-row ab-row-time">
						<text class="ab-row-label">提醒时间</text>
						<text class="ab-row-time-text" :class="{ 'ab-row-time-off': !reminderOn }">{{ reminderTime }}</text>
						<uni-icons type="right" size="14" color="var(--text-weak)" />
					</view>
				</picker>
				<text class="ab-row-tip">通过系统通知提醒，需允许本应用的通知权限；保持每天打开一次 App 提醒就不会断</text>
			</view>
			<!-- #endif -->

			<text class="ab-foot">感谢每一个支持我的你</text>
		</template>

		<!-- ===== 支持记录 ===== -->
		<template v-else>
			<view class="ab-rec-head">
				<text class="ab-rec-title">支持记录</text>
				<text class="ab-rec-sub">感谢每一位陪伴我的朋友</text>
				<text class="ab-rec-sub">因为有你们，才有我持续分享的动力</text>
			</view>

			<view class="ab-state" v-if="contributorsLoading">
				<uni-icons type="spinner-cycle" size="24" color="var(--brand)" />
				<text class="ab-state-text">加载中…</text>
			</view>
			<view class="ab-state" v-else-if="contributorsError" @click="fetchContributors">
				<uni-icons type="info" size="26" color="var(--danger)" />
				<text class="ab-state-text">名单加载失败，点击重试</text>
			</view>
			<view class="ab-state" v-else-if="!contributors.length">
				<text class="ab-state-text">暂时还没有需要感谢的人</text>
			</view>

			<view class="ab-contrib" v-for="c in contributors" :key="c.id" @click="selectContributor(c)">
				<image class="ab-contrib-avatar" :src="c.avatar_url" mode="aspectFill" v-if="c.avatar_url" />
				<view class="ab-contrib-avatar ab-contrib-avatar--fallback" v-else>
					<text class="ab-contrib-char">{{ (c.name || '').charAt(0) }}</text>
				</view>
				<view class="ab-contrib-main">
					<text class="ab-contrib-name">{{ c.name }}</text>
					<text class="ab-contrib-tip">{{ c.id === selectedId ? '已选中 · 点二维码放大' : '点一下看 TA 的抖音二维码' }}</text>
				</view>
				<image
					class="ab-contrib-qr"
					:class="{ 'ab-contrib-qr--on': c.id === selectedId }"
					:src="c.qr_url"
					mode="aspectFill"
					v-if="c.qr_url"
				/>
			</view>

			<template v-if="selectedContributor && selectedContributor.qr_url">
				<view class="ab-qr-wrap ab-qr-wrap--contrib" @click="previewQr(selectedContributor.qr_url)">
					<image class="ab-qr" :src="selectedContributor.qr_url" mode="widthFix" />
				</view>
				<button class="btn btn-primary full-btn ab-save-btn" @click="saveQr(selectedContributor.qr_url)">保存到相册</button>
			</template>

			<text class="ab-contrib-note">本应用内容均由以上博主免费分享，感谢他们的辛勤产出与无私分享</text>
			<text class="ab-foot">感谢一路有你</text>
		</template>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getContributors } from '@/api/contributors.js'
import { saveImageToAlbum } from '@/utils/save-image.js'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'
import {
	isReminderEnabled,
	setReminderEnabled,
	getReminderTime,
	setReminderTime,
	scheduleDailyReminders,
	cancelReminderMessages
} from '@/api/daily-reminder.js'

const MY_QR = '/static/douyin-qr.jpg'

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const tab = ref('me')

const contributors = ref([])
const contributorsLoaded = ref(false)
const contributorsLoading = ref(false)
const contributorsError = ref(false)
const selectedId = ref(null)

const selectedContributor = computed(
	() => contributors.value.find((c) => c.id === selectedId.value) || null
)

function goBack() {
	const pages = getCurrentPages()
	if (pages.length > 1) uni.navigateBack()
	else uni.switchTab({ url: '/pages/mine/index' })
}

function switchTab(t) {
	if (tab.value === t) return
	tab.value = t
	if (t === 'thanks' && !contributorsLoaded.value && !contributorsLoading.value) fetchContributors()
}

async function fetchContributors() {
	contributorsLoading.value = true
	contributorsError.value = false
	try {
		const list = await getContributors()
		contributors.value = list
		contributorsLoaded.value = true
		if (list.length && selectedId.value === null) selectedId.value = list[0].id
	} catch (e) {
		contributorsError.value = true
	} finally {
		contributorsLoading.value = false
	}
}

function selectContributor(c) {
	selectedId.value = c.id
}

function previewQr(path) {
	if (!path) return
	uni.previewImage({ urls: [path], current: path })
}

function saveQr(path) {
	if (!path) return
	saveImageToAlbum(path).catch(() => { /* 提示已在工具内给出 */ })
}

/* ==================== 每日更新提醒 ==================== */

const reminderOn = ref(false)
const reminderTime = ref('20:00')

function onReminderToggle(e) {
	const on = !!(e && e.detail && e.detail.value)
	setReminderEnabled(on)
	reminderOn.value = on
	if (on) {
		scheduleDailyReminders(true)
		uni.showToast({ title: `每天 ${reminderTime.value} 提醒你`, icon: 'none' })
	} else {
		cancelReminderMessages()
	}
}

function onReminderTimeChange(e) {
	const t = (e && e.detail && e.detail.value) || ''
	if (!/^\d{2}:\d{2}$/.test(t)) return
	setReminderTime(t)
	reminderTime.value = t
	if (reminderOn.value) {
		scheduleDailyReminders(true)
		uni.showToast({ title: `已改为每天 ${t} 提醒`, icon: 'none' })
	}
}

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
	reminderOn.value = isReminderEnabled()
	reminderTime.value = getReminderTime()
})
</script>

<style scoped>
	.about-page {
		/* 底色走变量：scoped 优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--ab-bg: linear-gradient(170deg, #e9f1ff 0%, #f6faff 55%, #ffffff 100%);
		--ab-card: #ffffff;
		--ab-card-border: rgba(255, 255, 255, 0.9);
		--ab-soft: #eef4ff;
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 12rpx) 24rpx calc(env(safe-area-inset-bottom) + 32rpx);
		background: var(--ab-bg);
	}

	.about-page.theme-thought {
		--ab-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
		--ab-card: rgba(20, 20, 25, 0.92);
		--ab-card-border: #2A2A32;
		--ab-soft: rgba(255, 255, 255, 0.05);
	}

	/* ===== 顶部 ===== */
	.ab-head {
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.ab-back {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: -14rpx;
		flex-shrink: 0;
	}

	.ab-seg {
		flex: 1;
		display: flex;
		flex-direction: row;
		background: var(--ab-soft);
		border-radius: 999rpx;
		padding: 6rpx;
		margin-left: 8rpx;
	}

	.ab-seg-item {
		flex: 1;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999rpx;
	}

	.ab-seg-item.active {
		background: var(--brand);
	}

	.ab-seg-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-aux);
	}

	.ab-seg-item.active .ab-seg-text {
		color: var(--on-brand);
		font-weight: 600;
	}

	/* ===== 关于我：头部 ===== */
	.ab-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12rpx 0 30rpx;
	}

	.ab-avatar {
		width: 168rpx;
		height: 168rpx;
		border-radius: 50%;
		border: 6rpx solid #ffffff;
		box-shadow: 0 12rpx 32rpx rgba(31, 45, 61, 0.14);
		background: #ffffff;
	}

	.theme-thought .ab-avatar {
		border-color: #2A2A32;
	}

	.ab-name {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
		margin-top: 22rpx;
	}

	.ab-slogan {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 10rpx;
	}

	.ab-divider {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 26rpx;
		width: 70%;
	}

	.ab-line {
		flex: 1;
		height: 1rpx;
		background: var(--divider);
	}

	.ab-divider-text {
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
		margin: 0 16rpx;
	}

	/* ===== 抖音卡片 ===== */
	.ab-dy {
		background: linear-gradient(160deg, #22304a 0%, #101827 60%, #0b1220 100%);
		border-radius: 32rpx;
		padding: 30rpx 28rpx 28rpx;
		box-shadow: 0 14rpx 40rpx rgba(16, 24, 39, 0.28);
	}

	.ab-dy-head {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.ab-dy-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #ffffff;
		margin-left: 10rpx;
	}

	.ab-dy-sub {
		display: block;
		font-size: calc(22rpx * var(--fs, 1));
		color: rgba(255, 255, 255, 0.72);
		margin-top: 8rpx;
	}

	.ab-qr-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 24rpx;
	}

	.ab-qr {
		width: 360rpx;
		border-radius: 20rpx;
		background: #ffffff;
	}

	.ab-dy-hint {
		display: block;
		text-align: center;
		font-size: calc(20rpx * var(--fs, 1));
		color: rgba(255, 255, 255, 0.6);
		margin-top: 18rpx;
	}

	.ab-save-btn {
		margin-top: 22rpx;
	}

	/* ===== 通用卡片 / 行 ===== */
	.ab-card {
		margin-top: 24rpx;
		background: var(--ab-card);
		border: 1rpx solid var(--ab-card-border);
		border-radius: 32rpx;
		padding: 26rpx 28rpx;
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .ab-card {
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
	}

	.ab-row-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 6rpx;
	}

	.ab-row-head-text {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--text);
		margin-left: 10rpx;
	}

	.ab-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0;
	}

	.ab-row-label {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text);
		flex: 1;
	}

	.ab-row-time-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--brand);
		margin-right: 8rpx;
	}

	.ab-row-time-off {
		color: var(--text-weak);
	}

	.ab-row-tip {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
		line-height: 1.6;
	}

	/* ===== 支持记录 ===== */
	.ab-rec-head {
		padding: 6rpx 6rpx 22rpx;
	}

	.ab-rec-title {
		display: block;
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text);
	}

	.ab-rec-sub {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	.ab-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 70rpx 0;
	}

	.ab-state-text {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 16rpx;
	}

	.ab-contrib {
		display: flex;
		flex-direction: row;
		align-items: center;
		background: var(--ab-card);
		border: 1rpx solid var(--ab-card-border);
		border-radius: 28rpx;
		padding: 24rpx;
		margin-bottom: 16rpx;
		box-shadow: 0 8rpx 24rpx rgba(31, 45, 61, 0.06);
	}

	.theme-thought .ab-contrib {
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.28);
	}

	.ab-contrib-avatar {
		width: 84rpx;
		height: 84rpx;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--ab-soft);
	}

	.ab-contrib-avatar--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ab-contrib-char {
		font-size: 32rpx;
		color: var(--text-aux);
	}

	.ab-contrib-main {
		flex: 1;
		min-width: 0;
		margin: 0 18rpx;
	}

	.ab-contrib-name {
		display: block;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.ab-contrib-tip {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	.ab-contrib-qr {
		width: 96rpx;
		height: 96rpx;
		border-radius: 16rpx;
		flex-shrink: 0;
		background: #ffffff;
		opacity: 0.55;
	}

	.ab-contrib-qr--on {
		opacity: 1;
		border: 2rpx solid var(--brand);
	}

	.ab-qr-wrap--contrib {
		margin-top: 26rpx;
	}

	.ab-contrib-note {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-weak);
		line-height: 1.68;
		margin-top: 24rpx;
	}

	.ab-foot {
		display: block;
		text-align: center;
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-weak);
		margin-top: 40rpx;
	}
</style>
