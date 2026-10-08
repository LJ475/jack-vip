<template>
	<view v-if="visible">
		<view class="sheet-mask" @click="close"></view>
		<view class="sheet">
			<view class="sheet-inner glassmorphism glass-sheet">
				<view class="vibrancy-effect"></view>
				<view class="sheet-head">
					<text class="sheet-title">关于我</text>
					<view class="sheet-close" @click="close">
						<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
					</view>
				</view>

				<!-- 标签切换：关于我 / 感谢 -->
				<view class="seg-wrap">
					<view class="seg">
						<view class="seg-item" :class="{ active: activeTab === 'me', sheen: activeTab === 'me' }" @click="switchTab('me')">
							<text class="seg-text">关于我</text>
						</view>
						<view class="seg-item" :class="{ active: activeTab === 'thanks', sheen: activeTab === 'thanks' }" @click="switchTab('thanks')">
							<text class="seg-text">感谢</text>
						</view>
					</view>
				</view>

				<scroll-view scroll-y class="sheet-body">
					<!-- 「关于我」：展示我自己的抖音二维码 -->
					<view class="about-wrap" v-if="activeTab === 'me'">
						<image class="about-qr" :src="MY_QR" mode="widthFix" @click="previewQr" />
						<text class="about-hint">先点下方按钮保存图片，再打开抖音「扫一扫」，从相册选择这张图即可关注我</text>
						<button class="btn btn-primary full-btn about-save-btn" @click="saveQr">保存到相册</button>

						<!-- 每日更新提醒（仅 App 端；本地通知不支持按日重复，靠打开 App 自动续期） -->
						<!-- #ifdef APP-PLUS -->
						<view class="reminder-block">
							<view class="reminder-head">
								<uni-icons type="notification" size="15" color="var(--brand)" />
								<text class="reminder-head-text">每日更新提醒</text>
							</view>
							<view class="reminder-row">
								<text class="reminder-label">每天提醒我来看新分享</text>
								<switch
									class="reminder-switch"
									:checked="reminderOn"
									color="var(--brand)"
									@change="onReminderToggle"
								/>
							</view>
							<picker mode="time" :value="reminderTime" :disabled="!reminderOn" @change="onReminderTimeChange">
								<view class="reminder-row reminder-row-time">
									<text class="reminder-label">提醒时间</text>
									<text class="reminder-time" :class="{ 'reminder-time-off': !reminderOn }">{{ reminderTime }}</text>
									<uni-icons type="right" size="14" color="var(--text-weak)" />
								</view>
							</picker>
							<text class="reminder-tip">通过系统通知提醒，需允许本应用的通知权限；保持每天打开一次 App 提醒就不会断</text>
						</view>
						<!-- #endif -->
					</view>

					<!-- 「感谢」：选择贡献者，展示 TA 的抖音二维码 -->
					<view class="about-wrap" v-else>
						<!-- 加载中 -->
						<view class="contrib-state" v-if="contributorsLoading">
							<view class="spinner-wrap">
								<uni-icons type="spinner-cycle" size="24" color="var(--brand)" />
							</view>
							<text class="contrib-state-text">加载中…</text>
						</view>

						<!-- 加载失败：点击重试 -->
						<view class="contrib-state" v-else-if="contributorsError" @click="fetchContributors">
							<uni-icons type="info" size="26" color="var(--danger)" />
							<text class="contrib-state-text">感谢名单加载失败，点击重试</text>
						</view>

						<!-- 空名单 -->
						<view class="contrib-state" v-else-if="!contributors.length">
							<text class="contrib-state-text">暂时还没有需要感谢的人</text>
						</view>

						<template v-else>
							<!-- 缩小版头像列表，点击切换对应的二维码 -->
							<scroll-view scroll-x class="contrib-scroll">
								<view class="contrib-row">
									<view
										class="contrib-item"
										v-for="c in contributors"
										:key="c.id"
										:class="{ active: c.id === selectedId }"
										@click="selectedId = c.id"
									>
										<image
											class="contrib-avatar"
											:src="c.avatar_url"
											mode="aspectFill"
											v-if="c.avatar_url"
										/>
										<view class="contrib-avatar contrib-avatar-fallback" v-else>
											<text class="contrib-avatar-char">{{ c.name.charAt(0) }}</text>
										</view>
										<text class="contrib-name">{{ c.name }}</text>
									</view>
								</view>
							</scroll-view>

								<template v-if="selectedContributor">
								<image class="about-qr about-qr-sm" :src="selectedContributor.qr_url" mode="widthFix" @click="previewQr" />
								<button class="btn btn-primary full-btn about-save-btn" @click="saveQr">保存到相册</button>
								<text class="about-thanks-note">本应用内容均由以上博主免费分享，感谢他们的辛勤产出与无私分享</text>
							</template>
						</template>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getContributors } from '@/api/contributors.js'
import { saveImageToAlbum } from '@/utils/save-image.js'
import {
	isReminderEnabled,
	setReminderEnabled,
	getReminderTime,
	setReminderTime,
	scheduleDailyReminders,
	cancelReminderMessages
} from '@/api/daily-reminder.js'

const props = defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const MY_QR = '/static/douyin-qr.jpg'

const activeTab = ref('me')

const contributors = ref([])
const contributorsLoaded = ref(false)
const contributorsLoading = ref(false)
const contributorsError = ref(false)
const selectedId = ref(null)

const selectedContributor = computed(() => {
	return contributors.value.find((c) => c.id === selectedId.value) || null
})

/** 当前展示的二维码（我的本地图 / 贡献者的远程图） */
const currentQrPath = computed(() => {
	if (activeTab.value === 'me') return MY_QR
	const c = selectedContributor.value
	return (c && c.qr_url) || ''
})

function close() {
	emit('close')
}

function switchTab(tab) {
	if (activeTab.value === tab) return
	activeTab.value = tab
	// 感谢名单懒加载：第一次切到「感谢」才请求
	if (tab === 'thanks' && !contributorsLoaded.value && !contributorsLoading.value) {
		fetchContributors()
	}
}

async function fetchContributors() {
	contributorsLoading.value = true
	contributorsError.value = false
	try {
		const list = await getContributors()
		contributors.value = list
		contributorsLoaded.value = true
		if (list.length && selectedId.value === null) {
			selectedId.value = list[0].id
		}
	} catch (e) {
		contributorsError.value = true
	} finally {
		contributorsLoading.value = false
	}
}

function previewQr() {
	const path = currentQrPath.value
	if (!path) return
	uni.previewImage({
		urls: [path],
		current: path
	})
}

function saveQr() {
	const path = currentQrPath.value
	if (!path) return
	saveImageToAlbum(path).catch(() => { /* 提示已在工具内给出 */ })
}

/* ==================== 每日更新提醒 ==================== */

const reminderOn = ref(false)
const reminderTime = ref('20:00')

watch(() => props.visible, (v) => {
	if (v) {
		reminderOn.value = isReminderEnabled()
		reminderTime.value = getReminderTime()
	}
})

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

	/* ===== 标签切换（关于我 / 感谢） ===== */
	.seg-wrap {
		padding: 0 28rpx 20rpx;
		position: relative;
		z-index: 1;
	}

	.seg {
		display: flex;
		padding: 6rpx;
		border-radius: 999px;
		background: rgba(137, 148, 169, 0.12);
	}

	.seg-item {
		flex: 1;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		transition: background 0.2s;
	}

	.seg-item.active {
		background: var(--brand);
	}

	.seg-text {
		font-size: 26rpx;
		color: var(--text-secondary);
	}

	.seg-item.active .seg-text {
		color: var(--on-brand);
		font-weight: 600;
	}

	/* ===== 弹层内容 ===== */
	.about-wrap {
		padding: 8rpx 28rpx 32rpx;
		box-sizing: border-box;
	}

	.about-qr {
		width: 100%;
		border-radius: var(--radius-md);
		background: #fff;
		display: block;
	}

	.about-hint {
		display: block;
		margin-top: 24rpx;
		font-size: 26rpx;
		color: var(--text-aux);
		line-height: 1.7;
		text-align: center;
	}

	.about-save-btn {
		margin-top: 28rpx;
	}

	/* ===== 每日更新提醒（仅 App 端渲染） ===== */
	.reminder-block {
		margin-top: 32rpx;
		padding: 24rpx 24rpx 8rpx;
		border-radius: var(--radius-md);
		background: rgba(137, 148, 169, 0.08);
	}

	.reminder-head {
		display: flex;
		align-items: center;
	}

	.reminder-head-text {
		margin-left: 8rpx;
		font-size: 26rpx;
		font-weight: 600;
		color: var(--text);
	}

	.reminder-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 4rpx;
	}

	.reminder-label {
		font-size: 26rpx;
		color: var(--text-secondary);
	}

	.reminder-time {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--brand);
		margin-right: 8rpx;
	}

	.reminder-time-off {
		color: var(--text-weak);
		font-weight: 400;
	}

	.reminder-tip {
		display: block;
		padding: 4rpx 4rpx 16rpx;
		font-size: 22rpx;
		color: var(--text-weak);
		line-height: 1.6;
	}

	/* 感谢页的二维码：固定小尺寸居中，不放太大 */
	.about-qr-sm {
		width: 440rpx;
		margin: 8rpx auto 0;
	}

	.about-thanks-note {
		display: block;
		margin-top: 28rpx;
		font-size: 26rpx;
		color: var(--text-secondary);
		line-height: 1.7;
		text-align: center;
	}

	/* ===== 感谢名单 ===== */
	.contrib-scroll {
		white-space: nowrap;
		width: 100%;
	}

	.contrib-row {
		display: inline-flex;
		flex-direction: row;
		align-items: flex-start;
		padding: 8rpx 4rpx 20rpx;
	}

	.contrib-item {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		margin-right: 28rpx;
	}

	.contrib-avatar {
		width: 88rpx;
		height: 88rpx;
		border-radius: 50%;
		border: 3rpx solid var(--border-soft);
		background: var(--brand-light);
		box-sizing: border-box;
	}

	.contrib-item.active .contrib-avatar {
		border: 3rpx solid var(--brand);
		box-shadow: 0 6rpx 18rpx var(--brand-glow-soft);
	}

	.contrib-avatar-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.contrib-avatar-char {
		font-size: 40rpx;
		font-weight: 600;
		color: var(--brand);
	}

	.contrib-name {
		margin-top: 10rpx;
		max-width: 96rpx;
		font-size: 22rpx;
		color: var(--text-aux);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}

	.contrib-item.active .contrib-name {
		color: var(--brand);
		font-weight: 600;
	}

	/* 加载 / 失败 / 空名单状态 */
	.contrib-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 56rpx 0 40rpx;
	}

	.contrib-state-text {
		margin-top: 20rpx;
		font-size: 26rpx;
		color: var(--text-aux);
	}

	.spinner-wrap {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
