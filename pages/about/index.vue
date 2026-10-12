<template>
	<view class="about-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<!-- 顶部：统一导航（跟 2030/干正事 同一套） -->
		<app-nav-bar title="关于我" />

		<!-- 分段胶囊：从导航行移到内容区第一行，导航才能跟其它页一致 -->
		<view class="ab-seg-wrap">
			<view class="ab-seg">
				<view class="ab-seg-item" :class="{ active: tab === 'me' }" @click="switchTab('me')">
					<text class="ab-seg-text">关于我</text>
				</view>
				<view class="ab-seg-item" :class="{ active: tab === 'thanks' }" @click="switchTab('thanks')">
					<text class="ab-seg-text">感谢</text>
				</view>
			</view>
		</view>

		<!-- ===== 关于我 ===== -->
		<template v-if="tab === 'me'">
			<view class="ab-hero">
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
				<view class="ab-qr-wrap">
					<image class="ab-qr" :src="MY_QR" mode="widthFix" />
				</view>
				<text class="ab-dy-hint">保存到相册后，可到抖音「扫一扫」从相册识别</text>
				<button class="btn btn-primary full-btn ab-save-btn" @click="saveQr(MY_QR)">保存到相册</button>
			</view>

			<text class="ab-foot">感谢每一个支持我的你</text>
		</template>

		<!-- ===== 感谢 ===== -->
		<template v-else>
			<view class="ab-rec-head">
				<text class="ab-rec-title">感谢</text>
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
					<text class="ab-contrib-tip">{{ c.id === selectedId ? '已选中 · 二维码在下方' : '点一下看 TA 的抖音二维码' }}</text>
				</view>
			</view>

			<template v-if="selectedContributor && selectedContributor.qr_url">
				<view class="ab-qr-wrap ab-qr-wrap--contrib">
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

function saveQr(path) {
	if (!path) return
	saveImageToAlbum(path).catch(() => { /* 提示已在工具内给出 */ })
}

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
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



	.ab-seg-wrap {
		margin-bottom: 26rpx;
	}

	.ab-seg {
		display: flex;
		flex-direction: row;
		background: var(--ab-soft);
		border-radius: 999rpx;
		padding: 6rpx;
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

	/* ===== 感谢 ===== */
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
