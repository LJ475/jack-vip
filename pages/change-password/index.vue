<template>
	<view class="cp-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<app-nav-bar title="修改密码" />

		<view class="cp-card">
			<text class="cp-account" v-if="email">当前账号：{{ email }}</text>
			<text class="cp-hint">先用当前密码验证一下，再设新密码。改完下次登录用新密码。</text>

			<view class="cp-field" :class="{ 'cp-field--focus': focus === 'cur' }">
				<text class="cp-label">当前密码</text>
				<input
					class="cp-input"
					v-model="cur"
					:password="!show"
					placeholder="请输入当前密码"
					placeholder-class="cp-ph"
					:maxlength="64"
					@focus="focus = 'cur'"
					@blur="focus = ''"
				/>
			</view>

			<view class="cp-field" :class="{ 'cp-field--focus': focus === 'n1' }">
				<text class="cp-label">新密码</text>
				<input
					class="cp-input"
					v-model="n1"
					:password="!show"
					placeholder="至少 6 位"
					placeholder-class="cp-ph"
					:maxlength="64"
					@focus="focus = 'n1'"
					@blur="focus = ''"
				/>
			</view>

			<view class="cp-field" :class="{ 'cp-field--focus': focus === 'n2' }">
				<text class="cp-label">确认新密码</text>
				<input
					class="cp-input"
					v-model="n2"
					:password="!show"
					placeholder="再输一遍新密码"
					placeholder-class="cp-ph"
					:maxlength="64"
					@focus="focus = 'n2'"
					@blur="focus = ''"
					@confirm="onSubmit"
				/>
			</view>

			<view class="cp-show" @click="show = !show">
				<uni-icons :type="show ? 'eye-filled' : 'eye'" size="16" color="var(--text-aux)" />
				<text class="cp-show-text">{{ show ? '隐藏密码' : '显示密码' }}</text>
			</view>

			<text class="cp-err" v-if="errText">{{ errText }}</text>
			<text class="cp-ok" v-if="okText">{{ okText }}</text>

			<view class="cp-btn" :class="{ 'cp-btn--loading': loading }" @click="onSubmit">
				<text class="cp-btn-text">{{ loading ? '提交中…' : '确认修改' }}</text>
			</view>

			<text class="cp-foot">忘了当前密码？加我微信 LforovW13，我帮你重置。</text>
		</view>
	</view>
</template>

<script setup>
/**
 * 修改密码（已登录状态下自助改，不需要邮箱、不发邮件）
 *
 * 为什么要「当前密码」这一栏：
 *   改密码前先用当前密码重新登录一次，等于验证「确实是本人」。
 *   不然捡到手机的人打开 App 就能直接把密码改掉，把号占了。
 *   细节见 utils/auth.js 的 changePassword()。
 *
 * 账号是管理员发号制的：管理员给的是统一初始密码，用户在这里改成自己的。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'
import { changePassword, currentUser } from '@/utils/auth.js'

const cur = ref('')
const n1 = ref('')
const n2 = ref('')
const show = ref(false)
const focus = ref('')
const loading = ref(false)
const errText = ref('')
const okText = ref('')
const email = ref('')

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

async function onSubmit() {
	if (loading.value) return
	errText.value = ''
	okText.value = ''

	if (!cur.value) { errText.value = '请先填当前密码'; return }
	if (n1.value.length < 6) { errText.value = '新密码至少 6 位'; return }
	if (n1.value !== n2.value) { errText.value = '两次输入的新密码不一样'; return }
	if (n1.value === cur.value) { errText.value = '新密码不能和当前密码一样'; return }

	loading.value = true
	try {
		await changePassword(cur.value, n1.value)
		okText.value = '密码已修改，下次登录请用新密码'
		uni.showToast({ title: '密码已修改', icon: 'none' })
		cur.value = ''
		n1.value = ''
		n2.value = ''
	} catch (e) {
		errText.value = (e && e.message) || '修改失败，稍后再试'
	} finally {
		loading.value = false
	}
}

onShow(() => {
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	refreshFontScale()
	const u = currentUser()
	email.value = (u && u.email) || ''
})
</script>

<style scoped>
	.cp-page {
		/* 底色走变量：scoped 优先级高于全局 .theme-thought，写死就翻不动暗色 */
		--cp-bg: linear-gradient(160deg, #eaf2ff 0%, #f7fbff 60%, #ffffff 100%);
		--cp-card: #ffffff;
		--cp-border: transparent;
		min-height: 100vh;
		background: var(--cp-bg);
	}

	.cp-page.theme-thought {
		--cp-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
		--cp-card: #1A1A1F;
		--cp-border: #2A2A32;
	}

	.cp-card {
		margin: 20rpx 32rpx 0;
		padding: 36rpx 32rpx 40rpx;
		background: var(--cp-card);
		border: 2rpx solid var(--cp-border);
		border-radius: var(--radius-lg, 40rpx);
		box-shadow: 0 10rpx 30rpx rgba(31, 45, 61, 0.06);
	}

	.cp-account {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-secondary);
		margin-bottom: 10rpx;
	}

	.cp-hint {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		line-height: 1.6;
		margin-bottom: 30rpx;
	}

	/* ===== 输入 ===== */
	.cp-field {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 104rpx;
		background: var(--focus-field-bg, rgba(255, 255, 255, 0.78));
		border: 2rpx solid var(--border-soft);
		border-radius: 999rpx;
		padding: 0 30rpx;
		margin-bottom: 22rpx;
	}

	.cp-field--focus {
		border-color: var(--brand);
	}

	.cp-label {
		flex-shrink: 0;
		width: 150rpx;
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-secondary);
	}

	.cp-input {
		flex: 1;
		height: 64rpx;
		font-size: calc(28rpx * var(--fs, 1));
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0;
	}

	.cp-ph {
		color: var(--text-weak);
	}

	.cp-show {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		padding: 0 10rpx;
		margin: -6rpx 0 8rpx;
	}

	.cp-show-text {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		margin-left: 8rpx;
	}

	.cp-err {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--danger);
		line-height: 1.6;
		margin: 6rpx 8rpx 0;
	}

	.cp-ok {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--success);
		line-height: 1.6;
		margin: 6rpx 8rpx 0;
	}

	.cp-btn {
		height: 100rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 34rpx;
		background: linear-gradient(135deg, #5B9CFF 0%, #3A83F7 50%, #2E6BE6 100%);
		box-shadow: 0 16rpx 36rpx rgba(58, 131, 247, 0.28);
	}

	.cp-btn--loading {
		opacity: 0.7;
	}

	.cp-btn-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.cp-foot {
		display: block;
		font-size: calc(23rpx * var(--fs, 1));
		color: var(--text-weak);
		line-height: 1.7;
		margin-top: 28rpx;
	}
</style>
