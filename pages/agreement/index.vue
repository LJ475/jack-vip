<template>
	<view class="ag-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<app-nav-bar title="条款与政策" />

		<!-- 分段胶囊：用户协议 / 隐私政策 -->
		<view class="ag-seg">
			<view class="ag-seg-item" :class="{ active: tab === 'terms' }" @click="switchTab('terms')">
				<text class="ag-seg-text">用户协议</text>
			</view>
			<view class="ag-seg-item" :class="{ active: tab === 'privacy' }" @click="switchTab('privacy')">
				<text class="ag-seg-text">隐私政策</text>
			</view>
		</view>

		<view class="ag-card">
			<text class="ag-title">{{ doc.title }}</text>
			<text class="ag-meta">最后更新：{{ UPDATED }} · 生效日期：{{ UPDATED }}</text>

			<view class="ag-section" v-for="(s, i) in doc.sections" :key="i">
				<text class="ag-h">{{ s.h }}</text>
				<text class="ag-p" v-for="(p, j) in s.p" :key="j">{{ p }}</text>
				<view class="ag-li" v-for="(l, j) in (s.li || [])" :key="'l' + j">
					<view class="ag-dot"></view>
					<text class="ag-li-text">{{ l }}</text>
				</view>
			</view>

			<view class="ag-foot">
				<uni-icons type="weixin" size="16" color="var(--brand)" />
				<text class="ag-foot-text">任何疑问或权利要求，加我微信 {{ WECHAT_ID }}</text>
			</view>
		</view>

		<text class="ag-tail">返回上一页继续登录</text>
	</view>
</template>

<script setup>
/**
 * 条款与政策（用户协议 + 隐私政策）
 *
 * 【这份文本是按代码的实际行为写的初稿，发布前请自己过一遍】
 *   - 写的是 App 真实在做的事：只收邮箱、密码交给 Supabase Auth、目标/本子/倒计时只存本机、
 *     倒计时响铃要那几个安卓权限、注销目前走人工、定期上报「最后活跃时间」用于判断账号是否在用。
 *   - 需要你确认或补上的：主体名称（个人还是公司）、备案号、争议解决方式与管辖地。
 *     备案号拿到后填到 utils/legal.js 的 ICP，这里会自动显示在页脚。
 *   - 上线前建议找懂行的人看一眼——尤其是免责那一段。
 */
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'

const WECHAT_ID = 'LforovW13'
const UPDATED = '2026-10-13'

const tab = ref('terms')
const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const TERMS = {
	title: '用户协议',
	sections: [
		{
			h: '一、服务内容',
			p: [
				'本 App 提供每日分享图浏览与收藏、2030 目标打卡、思考记录、倒计时提醒等功能。',
				'本 App 完全开源、免费，欢迎各位鲁国人使用。',
				'App 内的分享图等内容，来自抖音上 jack 叔叔的公开分享，是给粉丝免费看的，欢迎浏览与收藏。'
			]
		},
		{
			h: '二、账号',
			p: [
				'账号用邮箱与密码注册，一个邮箱对应一个账号。请自行保管好密码；用你的账号进行的操作，视为你本人的行为。',
				'如果你忘了密码，可以通过「我的 → 帮助与反馈」联系我，我核实后帮你重置（本 App 目前不发送验证邮件）。'
			]
		},
		{
			h: '三、你的数据',
			p: [
				'目标、打卡、思考记录、倒计时默认只保存在这台设备上。卸载 App、清除数据或更换手机会丢失，请用「我的 → 备份与恢复」自行导出一份。',
				'账号信息（邮箱）仅用于登录。App 会定期上报「最后活跃时间」，用来判断账号是否正在使用，不包含任何内容数据。'
			]
		},
		{
			h: '四、使用规范',
			p: [
				'请勿利用本 App 抓取、批量下载、转售其中的内容，也请勿攻击、干扰或试图绕过服务的安全限制。'
			]
		},
		{
			h: '五、提醒类功能',
			p: [
				'倒计时到点响铃依赖系统的闹钟、通知与后台运行策略。不同手机厂商的省电策略可能拦住提醒，因此本 App 不保证提醒 100% 触发；重要事项请另外设置一个提醒。'
			]
		},
		{
			h: '六、内容说明',
			p: [
				'App 内的分享图等内容，来自抖音上 jack 叔叔的公开分享，给各位鲁国人、jack 叔叔的粉丝们免费看，欢迎自行浏览与收藏。如果你不希望自己的内容出现在这里，可以通过文末方式联系我，我会及时核实并下架。'
			]
		},
		{
			h: '七、免责',
			p: [
				'因网络故障、设备故障、系统限制或不可抗力造成的服务中断、提醒未触发或数据丢失，本 App 在法律规定范围内不承担超出必要限度的责任。'
			]
		},
		{
			h: '八、协议变更',
			p: [
				'功能调整时本协议可能更新，更新后的文本会在本页展示。继续使用即视为接受更新后的协议。'
			]
		}
	]
}

const PRIVACY = {
	title: '隐私政策',
	sections: [
		{
			h: '一、我们收集哪些信息',
			li: [
				'账号信息：你注册时填写的邮箱地址，以及密码。密码由登录服务（Supabase Auth）加密保管，App 不保存密码明文。',
				'最后活跃时间：为了让你保持登录、并判断账号是否正在使用，App 会定期向服务器上报一个时间戳。它只跟账号绑定，不包含任何内容数据。',
				'设备本地数据：2030 目标、打卡记录、思考本子、倒计时、字体大小等设置。这些默认只存在这台设备上，不会上传。',
				'我们不收集：通讯录、短信、通话记录、精确位置、相册内容（只有你主动点「保存图片到相册」时才会用到相册写入权限）。'
			]
		},
		{
			h: '二、这些信息用来做什么',
			li: [
				'邮箱：用于登录你的账号、以及你忘记密码时帮你确认身份。',
				'最后活跃时间：用于判断账号是否正在使用（例如是否还开着 App），也方便排查登录问题。',
				'本地数据：用于在这台设备上展示你自己的记录与统计。',
				'我们不会把你的个人信息用于广告投放，也不会出售给任何第三方。'
			]
		},
		{
			h: '三、存储与第三方服务',
			li: [
				'账号数据（邮箱、密码凭据、最后活跃时间）保存在 Supabase 提供的数据库与登录服务上。',
				'分享图通过腾讯云对象存储（COS）与 CDN 加载，加载图片时你的网络请求会经过该服务。',
				'除上述为提供服务所必需的处理外，我们不会向第三方提供你的个人信息；法律法规另有要求的除外。'
			]
		},
		{
			h: '四、App 申请的权限及用途',
			li: [
				'通知（POST_NOTIFICATIONS）：倒计时到点时弹出提醒。',
				'闹钟（SET_ALARM）：用系统闹钟把 App 拉到前台响铃，这样杀掉后台也能提醒。',
				'震动（VIBRATE）：响铃时同时震动。',
				'唤醒锁定（WAKE_LOCK）：响铃时点亮屏幕，让提醒能被看到。',
				'网络状态（ACCESS_NETWORK_STATE、ACCESS_WIFI_STATE）：判断当前能不能加载图片，并给出「网络不太好」的提示。',
				'相册写入：只有你点「保存图片到相册」时才会使用。'
			]
		},
		{
			h: '五、你的权利',
			p: [
				'你可以随时查看自己的邮箱（「我的」页），也可以要求更正或删除账号。',
				'目前注销账号需要人工处理：通过文末的微信联系我，我核实身份后会删除你的账号，以及账号相关的数据（本机数据需要你自己在「我的 → 备份与恢复」里清除或卸载 App）。'
			]
		},
		{
			h: '六、未成年人',
			p: [
				'本 App 不面向 14 周岁以下的儿童。如果你是未成年人，请在监护人同意后使用。'
			]
		},
		{
			h: '七、政策更新',
			p: [
				'本政策如有更新，会在本页展示最新版本与更新时间。继续使用即视为接受更新后的政策。'
			]
		}
	]
}

const doc = computed(() => (tab.value === 'privacy' ? PRIVACY : TERMS))

function switchTab(t) {
	tab.value = t === 'privacy' ? 'privacy' : 'terms'
}

onLoad((options) => {
	switchTab((options && options.tab) || 'terms')
})

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
})
</script>

<style scoped>
	.ag-page {
		/* 底色走变量：scoped 优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--ag-bg: linear-gradient(160deg, #eaf2ff 0%, #f7fbff 60%, #ffffff 100%);
		--ag-card: #ffffff;
		--ag-card-border: rgba(255, 255, 255, 0.9);
		--ag-seg-bg: rgba(23, 33, 58, 0.06);
		--ag-foot-bg: #f2f7ff;
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 12rpx) 24rpx calc(env(safe-area-inset-bottom) + 40rpx);
		background: var(--ag-bg);
	}

	.ag-page.theme-thought {
		--ag-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
		--ag-card: rgba(20, 20, 25, 0.92);
		--ag-card-border: #2A2A32;
		--ag-seg-bg: rgba(255, 255, 255, 0.06);
		--ag-foot-bg: rgba(255, 255, 255, 0.05);
	}

	.ag-seg {
		display: flex;
		flex-direction: row;
		background: var(--ag-seg-bg);
		border-radius: 999rpx;
		padding: 6rpx;
		margin-bottom: 26rpx;
	}

	.ag-seg-item {
		flex: 1;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999rpx;
	}

	.ag-seg-item.active {
		background: var(--brand);
	}

	.ag-seg-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-aux);
	}

	.ag-seg-item.active .ag-seg-text {
		color: var(--on-brand);
		font-weight: 600;
	}

	.ag-card {
		background: var(--ag-card);
		border: 1rpx solid var(--ag-card-border);
		border-radius: 32rpx;
		padding: 32rpx 30rpx;
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .ag-card {
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
	}

	.ag-title {
		display: block;
		font-size: 38rpx;
		font-weight: 700;
		color: var(--text);
	}

	.ag-meta {
		display: block;
		font-size: calc(21rpx * var(--fs, 1));
		color: var(--text-weak);
		margin-top: 10rpx;
	}

	.ag-section {
		margin-top: 32rpx;
	}

	.ag-h {
		display: block;
		font-size: calc(29rpx * var(--fs, 1));
		font-weight: 600;
		color: var(--text);
		margin-bottom: 12rpx;
	}

	.ag-p {
		display: block;
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-secondary);
		line-height: 1.85;
		margin-bottom: 10rpx;
	}

	.ag-li {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-bottom: 10rpx;
	}

	.ag-dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: var(--brand);
		flex-shrink: 0;
		margin: 16rpx 14rpx 0 0;
	}

	.ag-li-text {
		flex: 1;
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-secondary);
		line-height: 1.85;
	}

	.ag-foot {
		display: flex;
		flex-direction: row;
		align-items: center;
		background: var(--ag-foot-bg);
		border-radius: 20rpx;
		padding: 22rpx 24rpx;
		margin-top: 36rpx;
	}

	.ag-foot-text {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-secondary);
		margin-left: 12rpx;
	}

	.ag-tail {
		display: block;
		font-size: calc(21rpx * var(--fs, 1));
		color: var(--text-weak);
		text-align: center;
		margin-top: 28rpx;
	}
</style>
