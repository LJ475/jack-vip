<template>
	<view class="page">
		<app-nav-bar title="登录" back-to="/pages/mine/index" />

		<view class="auth-card glassmorphism">
			<view class="vibrancy-effect"></view>

			<text class="auth-title">登录</text>
			<text class="auth-sub">登录后换手机也能找回你的账号</text>

			<view class="field glassmorphism glass-input" :class="{ 'field-focus': focus === 'email' }" @click.stop>
				<view class="field-icon">
					<uni-icons type="email" size="18" :color="focus === 'email' ? 'var(--brand)' : 'var(--text-aux)'" />
				</view>
				<input
					class="field-input"
					v-model="email"
					type="text"
					placeholder="邮箱"
					placeholder-class="ph"
					:maxlength="64"
					confirm-type="next"
					@focus="focus = 'email'"
					@blur="focus = ''"
				/>
			</view>

			<view class="field glassmorphism glass-input" :class="{ 'field-focus': focus === 'password' }" @click.stop>
				<view class="field-icon">
					<uni-icons type="locked" size="18" :color="focus === 'password' ? 'var(--brand)' : 'var(--text-aux)'" />
				</view>
				<input
					class="field-input"
					v-model="password"
					:password="!showPwd"
					placeholder="密码"
					placeholder-class="ph"
					:maxlength="64"
					confirm-type="done"
					@focus="focus = 'password'"
					@blur="focus = ''"
					@confirm="onSubmit"
				/>
				<view class="field-eye" @click.stop="showPwd = !showPwd">
					<uni-icons :type="showPwd ? 'eye-filled' : 'eye'" size="18" color="var(--text-aux)" />
				</view>
			</view>

			<text class="auth-err" v-if="errText">{{ errText }}</text>

			<button class="btn btn-primary full-btn auth-btn" :disabled="loading" @click="onSubmit">
				{{ loading ? '登录中…' : '登录' }}
			</button>

			<view class="auth-switch" @click="goRegister">
				<text class="auth-switch-text">还没有账号？</text>
				<text class="auth-link">去注册</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { signIn, currentUser } from '@/utils/auth.js'

const email = ref('')
const password = ref('')
const showPwd = ref(false)
const focus = ref('')
const loading = ref(false)
const errText = ref('')

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
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/mine/index' })
		}, 600)
	} catch (e) {
		errText.value = (e && e.message) || '登录失败'
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
	.auth-card {
		padding: 44rpx 32rpx 36rpx;
		border-radius: var(--radius-xl);
	}

	.auth-title {
		display: block;
		font-size: calc(38rpx * var(--fs, 1));
		font-weight: 600;
		color: var(--text);
	}

	.auth-sub {
		display: block;
		margin-top: 10rpx;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--text-aux);
		line-height: 1.6;
	}

	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		margin-top: 28rpx;
	}

	.field-focus {
		--glass-border: var(--focus-border);
		--glass-bg: var(--focus-field-bg);
	}

	.field-icon {
		width: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.field-input {
		flex: 1;
		height: 60rpx;
		margin-left: 12rpx;
		font-size: calc(28rpx * var(--fs, 1));
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0;
	}

	.field-eye {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.auth-err {
		display: block;
		margin-top: 20rpx;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--danger);
		line-height: 1.6;
	}

	.auth-btn {
		margin-top: 36rpx;
	}

	.auth-switch {
		margin-top: 28rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}

	.auth-switch-text {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--text-aux);
	}

	.auth-link {
		font-size: calc(26rpx * var(--fs, 1));
		color: var(--brand);
		font-weight: 600;
	}
</style>
