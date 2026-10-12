<template>
	<view class="au-page" :class="{ 'theme-thought': isThoughtTheme }">
		<!-- 顶部人像区（照片 /static/login-hero.jpg；竖构图大头照，裁切位置见下面 .au-hero-img） -->
		<view class="au-hero">
			<image class="au-hero-img" src="/static/login-hero.jpg" mode="widthFix" />
			<view class="au-hero-fade"></view>
			<view class="au-hello">
				<text class="au-hello-text">你好，</text>
				<text class="au-hello-text">很高兴见到你！</text>
				<view class="au-hello-line"></view>
			</view>
		</view>

		<view class="au-body">
			<!-- 标题：开启 6年之约 -->
			<view class="au-title">
				<text class="au-title-a">开启</text>
				<text class="au-title-b">6年之约</text>
				<view class="au-title-mark"></view>
			</view>
			<text class="au-sub">用每天的坚持，遇见更好的自己</text>

			<view class="au-fields">
				<view class="af" :class="{ 'af--focus': focus === 'email' }" @click.stop>
					<view class="af-icon">
						<uni-icons type="email" size="20" :color="focus === 'email' ? 'var(--brand)' : 'var(--text-weak)'" />
					</view>
					<input
						class="af-input"
						v-model="email"
						type="text"
						placeholder="请输入邮箱地址"
						placeholder-class="ph"
						:maxlength="64"
						confirm-type="next"
						@focus="focus = 'email'"
						@blur="focus = ''"
					/>
				</view>

				<view class="af" :class="{ 'af--focus': focus === 'password' }" @click.stop>
					<view class="af-icon">
						<uni-icons type="locked" size="20" :color="focus === 'password' ? 'var(--brand)' : 'var(--text-weak)'" />
					</view>
					<input
						class="af-input"
						v-model="password"
						:password="!showPwd"
						placeholder="请输入密码"
						placeholder-class="ph"
						:maxlength="64"
						confirm-type="done"
						@focus="focus = 'password'"
						@blur="focus = ''"
						@confirm="onSubmit"
					/>
					<view class="af-eye" @click.stop="showPwd = !showPwd">
						<uni-icons :type="showPwd ? 'eye-filled' : 'eye'" size="20" color="var(--text-weak)" />
					</view>
				</view>
			</view>

			<text class="au-err" v-if="errText">{{ errText }}</text>

			<view class="au-btn" :class="{ 'au-btn--loading': loading }" @click="onSubmit">
				<text class="au-btn-text">{{ loading ? '登录中…' : '登录' }}</text>
			</view>

			<view class="au-switch" @click="goRegister">
				<text class="au-switch-text">还没有账号？</text>
				<text class="au-link">去注册</text>
			</view>

			<text class="au-foot">和更好的自己相遇</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { signIn, currentUser } from '@/utils/auth.js'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode } from '@/utils/app-mode.js'

const email = ref('')
const password = ref('')
const showPwd = ref(false)
const focus = ref('')
const loading = ref(false)
const errText = ref('')
const isThoughtTheme = ref(false)

function goRegister() {
	uni.redirectTo({ url: '/pages/register/index' })
}

async function onSubmit() {
	if (loading.value) return
	errText.value = ''
	const mail = email.value.trim()
	if (!mail) { errText.value = '先填邮箱'; return }
	if (!password.value) { errText.value = '先填密码'; return }

	loading.value = true
	try {
		await signIn(mail, password.value)
		const u = currentUser()
		uni.showToast({ title: u && u.email ? `已登录 ${u.email}` : '登录成功', icon: 'none' })
		setTimeout(() => {
			// 登录后统一回到首页 tab：守卫是 reLaunch 过来的，栈里没有"上一页"可退
			uni.reLaunch({ url: '/pages/calendar/index' })
		}, 600)
	} catch (e) {
		errText.value = (e && e.message) || '登录失败'
	} finally {
		loading.value = false
	}
}

onLoad(() => {
	isThoughtTheme.value = getAppMode() === CONTENT_MODE.THOUGHT
	// 手写字用本子那套奶酪体（文件在 static/fonts 里，没放就自动回落系统字体）
	uni.loadFontFace({
		family: 'NailaoHand',
		source: 'url("/static/fonts/nailao.ttf")',
		global: true
	})
})
</script>

<style scoped>
	.au-page {
		/* 底色走变量：scoped 优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--au-bg: linear-gradient(180deg, #eaf2ff 0%, #f8fbff 45%, #ffffff 100%);
		--au-card: #ffffff;
		--au-ink: #1f2b45;
		min-height: 100vh;
		background: var(--au-bg);
	}

	.au-page.theme-thought {
		--au-bg: linear-gradient(180deg, #101018 0%, #0B0B0F 60%);
		--au-card: #1A1A1F;
		--au-ink: #E8E8EA;
	}

	/* ===== 顶部人像 ===== */
	.au-hero {
		position: relative;
		width: 100%;
		height: 620rpx;
		overflow: hidden;
	}

	/* 照片是竖构图大头照：靠上对齐会把嘴切进淡出带里，所以整张往下推 150rpx，
	   让 620rpx 这条带子刚好落在「额头—胸口」，淡出只吃衣服。换照片要重算这个偏移。 */
	.au-hero-img {
		position: absolute;
		left: 0;
		top: -150rpx;
		width: 100%;
	}

	/* 照片下沿化进页面底 */
	.au-hero-fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 170rpx;
		background: linear-gradient(180deg, rgba(248, 251, 255, 0) 0%, rgba(248, 251, 255, 0.85) 62%, #f8fbff 100%);
	}

	.theme-thought .au-hero-fade {
		background: linear-gradient(180deg, rgba(16, 16, 24, 0) 0%, rgba(16, 16, 24, 0.85) 62%, #101018 100%);
	}

	/* 手写问候：贴在淡出带上（压在头发/书架上对比度只有 2.2:1，看不清） */
	.au-hello {
		position: absolute;
		left: 44rpx;
		bottom: 40rpx;
	}

	.au-hello-text {
		display: block;
		font-family: 'NailaoHand', 'PingFang SC', sans-serif;
		font-size: calc(38rpx * var(--fs, 1));
		color: #2b3a55;
		line-height: 1.35;
	}

	.theme-thought .au-hello-text {
		color: #8fa8cc;
	}

	.au-hello-line {
		width: 180rpx;
		height: 4rpx;
		border-radius: 999rpx;
		background: rgba(43, 58, 85, 0.4);
		margin-top: 12rpx;
		transform: rotate(-2deg);
	}

	/* ===== 正文 ===== */
	.au-body {
		padding: 8rpx 44rpx calc(env(safe-area-inset-bottom) + 40rpx);
	}

	.au-title {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: flex-end;
	}

	.au-title-a {
		font-size: 56rpx;
		font-weight: 700;
		color: var(--au-ink);
		letter-spacing: 2rpx;
	}

	.au-title-b {
		font-family: 'NailaoHand', 'PingFang SC', sans-serif;
		font-size: 62rpx;
		color: var(--brand);
		margin-left: 16rpx;
	}

	.au-title-mark {
		position: absolute;
		left: 130rpx;
		bottom: 2rpx;
		width: 300rpx;
		height: 6rpx;
		border-radius: 999rpx;
		background: var(--brand);
		opacity: 0.55;
		transform: rotate(-1.5deg);
	}

	.au-sub {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-top: 14rpx;
	}

	/* ===== 输入 ===== */
	.au-fields {
		margin-top: 46rpx;
	}

	.af {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 104rpx;
		background: var(--au-card);
		border: 2rpx solid transparent;
		border-radius: 999rpx;
		padding: 0 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 8rpx 26rpx rgba(31, 45, 61, 0.07);
	}

	.theme-thought .af {
		border-color: #2A2A32;
		box-shadow: 0 8rpx 26rpx rgba(0, 0, 0, 0.3);
	}

	.af--focus {
		border-color: var(--brand);
	}

	.af-icon {
		width: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.af-input {
		flex: 1;
		height: 64rpx;
		margin-left: 14rpx;
		font-size: calc(28rpx * var(--fs, 1));
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0;
	}

	.af-eye {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.au-err {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--danger);
		line-height: 1.6;
		margin: 4rpx 8rpx 0;
	}

	/* ===== 主按钮 ===== */
	.au-btn {
		height: 104rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 36rpx;
		background: linear-gradient(135deg, #5B9CFF 0%, #3A83F7 50%, #2E6BE6 100%);
		box-shadow: 0 16rpx 36rpx rgba(58, 131, 247, 0.32);
	}

	.au-btn--loading {
		opacity: 0.7;
	}

	.au-btn-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.au-switch {
		margin-top: 30rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}

	.au-switch-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-aux);
	}

	.au-link {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--brand);
		font-weight: 600;
		margin-left: 6rpx;
	}

	.au-foot {
		display: block;
		text-align: center;
		font-family: 'NailaoHand', 'PingFang SC', sans-serif;
		font-size: calc(30rpx * var(--fs, 1));
		color: #7fa0cc;
		margin-top: 90rpx;
	}
</style>
