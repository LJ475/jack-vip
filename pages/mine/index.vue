<template>
	<view class="page page-tabbar mine-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<!-- 头部：头像 + 名称 + 本机编号 + 说明 -->
		<view class="mp-head">
			<image class="mp-avatar" src="/static/logo.png" mode="aspectFill" />
			<view class="mp-head-main">
				<text class="mp-name">jack会员分享</text>
				<view class="mp-id-row">
					<text class="mp-id">本机编号：{{ deviceNo }}</text>
				</view>
				<text class="mp-slogan">数据只存在这台设备 · 不联网不注册</text>
			</view>
		</view>

		<!-- 本机数据一览（都是真算出来的，不是写死的） -->
		<view class="mp-stats">
			<view class="mp-stat" v-for="s in stats" :key="s.label">
				<text class="mp-stat-num">{{ s.value }}</text>
				<text class="mp-stat-label">{{ s.label }}</text>
				<uni-icons :type="s.icon" size="16" :color="s.color" />
			</view>
		</view>

		<!-- 两个入口并排 -->
		<view class="mp-entries">
			<view class="mp-entry mp-entry--blue" @click="goGoals">
				<view class="mp-entry-icon mp-entry-icon--blue">
					<uni-icons type="star-filled" size="20" color="#3A83F7" />
				</view>
				<view class="mp-entry-main">
					<text class="mp-entry-title">2030 目标</text>
					<text class="mp-entry-desc">长期目标 · 每日打卡</text>
				</view>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>

			<view class="mp-entry mp-entry--gold" @click="goWork">
				<view class="mp-entry-icon mp-entry-icon--gold">
					<uni-icons type="calendar-filled" size="20" color="#E8933E" />
				</view>
				<view class="mp-entry-main">
					<text class="mp-entry-title">干正事</text>
					<text class="mp-entry-desc">倒计时 · 到点响铃</text>
				</view>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
		</view>

		<!-- 数据与回顾（每一项都真的能点开） -->
		<view class="mp-card">
			<text class="mp-card-title">数据与回顾</text>
			<view class="mp-row" @click="openArchive">
				<uni-icons type="compose" size="18" color="var(--text-secondary)" />
				<text class="mp-row-title">往期回顾</text>
				<text class="mp-row-extra">{{ stats[2].value }} 篇</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
			<view class="mp-row" @click="backupVisible = true">
				<uni-icons type="download-filled" size="18" color="var(--text-secondary)" />
				<text class="mp-row-title">备份与恢复</text>
				<text class="mp-row-extra">导出 / 恢复</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
		</view>

		<!-- 设置与帮助 -->
		<view class="mp-card">
			<text class="mp-card-title">设置与帮助</text>
			<view class="mp-row" @click="chooseFontScale">
				<text class="mp-row-aa">Aa</text>
				<text class="mp-row-title">字体大小</text>
				<text class="mp-row-extra">{{ fsLabel }}</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
			<view class="mp-row" @click="openHelp">
				<uni-icons type="help-filled" size="18" color="var(--text-secondary)" />
				<text class="mp-row-title">帮助与反馈</text>
				<text class="mp-row-extra">微信找我</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
			<view class="mp-row" @click="openAbout">
				<uni-icons type="info-filled" size="18" color="var(--text-secondary)" />
				<text class="mp-row-title">关于我</text>
				<text class="mp-row-extra">抖音二维码</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
			<view class="mp-row" @click="confirmLogout">
				<uni-icons type="closeempty" size="18" color="var(--text-secondary)" />
				<text class="mp-row-title">退出登录</text>
				<uni-icons type="right" size="12" color="var(--text-weak)" />
			</view>
		</view>

		<!-- 备份与恢复弹层 -->
		<data-backup-sheet :visible="backupVisible" @close="backupVisible = false" />

		<!-- 字体大小选择（自带主题，暗色下也看得清） -->
		<app-action-sheet
			:visible="fsSheetVisible"
			title="字体大小"
			:items="fsItems"
			@close="fsSheetVisible = false"
			@select="onFsSelect"
		/>

		<!-- 底部导航（我的为第二项） -->
		<app-tab-bar :current="1" />
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme, hideNativeTabBar } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale, SCALES, setFontScaleKey, fontScaleLabel } from '@/utils/font-scale.js'
import { getAllNotes, calcStreak } from '@/utils/thought-notes.js'
import { listTimers, TIMER_STATUS } from '@/api/countdown.js'
import { currentUser, signOut } from '@/utils/auth.js'

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const backupVisible = ref(false)
const deviceNo = ref('')
const accountEmail = ref('')
const counted = ref({ checkins: 0, streak: 0, notes: 0, done: 0 })

/** 四个数字都从本机数据现算：打卡总天数 / 连续记录天数 / 本子篇数 / 完成的倒计时数 */
const stats = computed(() => [
	{ label: '打卡', value: counted.value.checkins, icon: 'checkbox-filled', color: '#3A83F7' },
	{ label: '连续', value: counted.value.streak, icon: 'fire-filled', color: '#F0B23E' },
	{ label: '文章', value: counted.value.notes, icon: 'compose', color: '#8B5CF6' },
	{ label: '完成', value: counted.value.done, icon: 'checkmarkempty', color: '#27C68A' }
])

/** 本机编号：没有账号体系，这里给这台设备生成本地标识并一直用它 */
function ensureDeviceNo() {
	let no = ''
	try { no = uni.getStorageSync('deviceNo') || '' } catch (e) { /* 忽略 */ }
	if (no) return no
	const s = String(Date.now()).slice(-8)
	no = `${s.slice(0, 4)}-${s.slice(4)}`
	try { uni.setStorageSync('deviceNo', no) } catch (e) { /* 忽略 */ }
	return no
}

function refreshCounts() {
	let checkins = 0
	try {
		const env = uni.getStorageSync('goals2030')
		const goals = (env && env.goals) || []
		goals.forEach((g) => { checkins += (g.checkins || []).length })
	} catch (e) { /* 读不到算 0 */ }

	let done = 0
	try {
		done = listTimers().filter((t) => t.status === TIMER_STATUS.COMPLETED).length
	} catch (e) { /* 忽略 */ }

	counted.value = {
		checkins,
		streak: calcStreak(),
		notes: getAllNotes().length,
		done
	}
}

function goGoals() {
	uni.navigateTo({ url: '/pages/goals/index' })
}

function goWork() {
	uni.navigateTo({ url: '/pages/work/index' })
}

function openArchive() {
	uni.navigateTo({ url: '/pages/thought-archive/index' })
}

/** 关于我：整页（原来是个底部弹层，他要求改成跳页） */
function openAbout() {
	uni.navigateTo({ url: '/pages/about/index' })
}

/** 帮助与反馈：整页（里面是能加到他的微信联系方式） */
function openHelp() {
	uni.navigateTo({ url: '/pages/help/index' })
}

/** 字体大小：三档，选完立即生效（只影响正文与说明，标题/按钮不动）。
 *  用自己的弹层而不是 uni.showActionSheet：系统那个在暗色下深底深字看不清。 */
const fsLabel = ref(fontScaleLabel())
const fsSheetVisible = ref(false)
const fsItems = computed(() => SCALES.map((s) => ({ label: s.label })))

function chooseFontScale() {
	fsSheetVisible.value = true
}

function onFsSelect(i) {
	const hit = SCALES[i]
	if (!hit) return
	setFontScaleKey(hit.key)
	refreshFontScale()
	fsLabel.value = hit.label
	uni.showToast({ title: `字号：${hit.label}`, icon: 'none' })
}

/** 退出登录：确认后清本机登录态并回登录页 */
function confirmLogout() {
	if (!accountEmail.value) {
		uni.showToast({ title: '当前没有登录账号', icon: 'none' })
		return
	}
	uni.showModal({
		title: '退出登录',
		content: `当前账号：${accountEmail.value}`,
		confirmText: '退出',
		confirmColor: '#FF5F6D',
		success: (res) => {
			if (!res.confirm) return
			signOut().then(() => {
				accountEmail.value = ''
				uni.reLaunch({ url: '/pages/login/index' })
			})
		}
	})
}

onShow(() => {
	hideNativeTabBar()
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
	deviceNo.value = ensureDeviceNo()
	refreshCounts()
	// 从登录页回来时要立刻反映登录态
	const u = currentUser()
	accountEmail.value = (u && u.email) || ''
})
</script>

<style scoped>
	.mine-page {
		/* 底色走变量：scoped 选择器优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--mine-bg: linear-gradient(160deg, #eaf2ff 0%, #f7fbff 60%, #ffffff 100%);
		min-height: 100vh;
		background: var(--mine-bg);
	}

	.mine-page.theme-thought {
		--mine-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
	}

	/* ===== 头部 ===== */
	.mp-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 20rpx 8rpx 32rpx;
	}

	.mp-avatar {
		width: 132rpx;
		height: 132rpx;
		border-radius: 50%;
		border: 4rpx solid #ffffff;
		box-shadow: 0 10rpx 28rpx rgba(31, 45, 61, 0.14);
		flex-shrink: 0;
		background: #ffffff;
	}

	.mp-head-main {
		flex: 1;
		margin-left: 26rpx;
		min-width: 0;
	}

	.mp-name {
		display: block;
		font-size: 42rpx;
		font-weight: 700;
		color: var(--text);
	}

	.mp-id-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 10rpx;
	}

	.mp-id {
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
	}

	.mp-slogan {
		display: block;
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 8rpx;
	}

	/* ===== 数字一览 ===== */
	.mp-stats {
		display: flex;
		flex-direction: row;
		background: #ffffff;
		border-radius: 32rpx;
		padding: 28rpx 0;
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .mp-stats {
		background: rgba(20, 20, 25, 0.92);
		border: 1rpx solid #2A2A32;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
	}

	.mp-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.mp-stat-num {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text);
	}

	.mp-stat-label {
		font-size: calc(22rpx * var(--fs, 1));
		color: var(--text-aux);
		margin: 6rpx 0 10rpx;
	}

	/* ===== 两个入口并排 ===== */
	.mp-entries {
		display: flex;
		flex-direction: row;
		margin-top: 24rpx;
	}

	.mp-entry {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 26rpx 22rpx;
		border-radius: 28rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.9);
	}

	.mp-entry + .mp-entry {
		margin-left: 20rpx;
	}

	.mp-entry--blue {
		background: #e8f1ff;
	}

	.mp-entry--gold {
		background: #fdf3e3;
	}

	.theme-thought .mp-entry {
		border-color: #2A2A32;
	}

	.theme-thought .mp-entry--blue {
		background: rgba(58, 131, 247, 0.14);
	}

	.theme-thought .mp-entry--gold {
		background: rgba(232, 179, 65, 0.14);
	}

	.mp-entry-icon {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mp-entry-icon--blue {
		background: #ffffff;
	}

	.mp-entry-icon--gold {
		background: #ffffff;
	}

	.theme-thought .mp-entry-icon {
		background: rgba(255, 255, 255, 0.08);
	}

	.mp-entry-main {
		flex: 1;
		margin: 0 12rpx 0 16rpx;
		min-width: 0;
	}

	.mp-entry-title {
		display: block;
		font-size: calc(28rpx * var(--fs, 1));
		font-weight: 600;
		color: var(--text);
	}

	.mp-entry-desc {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 6rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	/* ===== 数据与回顾 ===== */
	.mp-card {
		margin-top: 24rpx;
		background: #ffffff;
		border-radius: 32rpx;
		padding: 8rpx 28rpx 12rpx;
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .mp-card {
		background: rgba(20, 20, 25, 0.92);
		border: 1rpx solid #2A2A32;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
	}

	.mp-card-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
		padding: 26rpx 0 10rpx;
	}

	.mp-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 26rpx 0;
	}

	.mp-row + .mp-row {
		border-top: 1rpx solid var(--divider);
	}

	.mp-row-title {
		flex: 1;
		font-size: calc(28rpx * var(--fs, 1));
		color: var(--text);
		margin-left: 20rpx;
	}

	/* 「字体大小」那行左侧的 Aa 字符，跟图标一样占 18 号的位置 */
	.mp-row-aa {
		width: 36rpx;
		font-size: calc(28rpx * var(--fs, 1));
		font-weight: 700;
		color: var(--text-secondary);
		text-align: center;
	}

	.mp-row-extra {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-right: 10rpx;
	}
</style>
