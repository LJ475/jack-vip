<template>
	<view class="page">
		<app-nav-bar title="注册" back-to="/pages/mine/index" />

		<view class="auth-card glassmorphism">
			<view class="vibrancy-effect"></view>

			<text class="auth-title">注册</text>
			<text class="auth-sub">只要一个邮箱就行，用来登录和换手机时找回账号</text>

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
					placeholder="密码（至少 6 位）"
					placeholder-class="ph"
					:maxlength="64"
					confirm-type="next"
					@focus="focus = 'password'"
					@blur="focus = ''"
				/>
				<view class="field-eye" @click.stop="showPwd = !showPwd">
					<uni-icons :type="showPwd ? 'eye-filled' : 'eye'" size="18" color="var(--text-aux)" />
				</view>
			</view>

			<view class="field glassmorphism glass-input" :class="{ 'field-focus': focus === 'confirm' }" @click.stop>
				<view class="field-icon">
					<uni-icons type="locked" size="18" :color="focus === 'confirm' ? 'var(--brand)' : 'var(--text-aux)'" />
				</view>
				<input
					class="field-input"
					v-model="confirm"
					:password="!showPwd"
					placeholder="再输一次密码"
					placeholder-class="ph"
					:maxlength="64"
					confirm-type="done"
					@focus="focus = 'confirm'"
					@blur="focus = ''"
					@confirm="onSubmit"
				/>
			</view>

			<text class="auth-err" v-if="errText">{{ errText }}</text>
			<text class="auth-ok" v-if="okText">{{ okText }}</text>

			<button class="btn btn-primary full-btn auth-btn" :disabled="loading" @click="onSubmit">
				{{ loading ? '提交中…' : '注册' }}
			</button>

			<view class="auth-switch" @click="goLogin">
				<text class="auth-switch-text">已经有账号了？</text>
				<text class="auth-link">去登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { signUp } from '@/utils/auth.js'

const email = ref('')
const password = ref('')
const confirm = ref('')
const showPwd = ref(false)
const focus = ref('')
const loading = ref(false)
const errText = ref('')
const okText = ref('')

function goLogin() {
	uni.redirectTo({ url: '/pages/login/index' })
}

async function onSubmit() {
	if (loading.value) return
	errText.value = ''
	okText.value = ''

	const mail = email.value.trim()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { errText.value = '邮箱格式看起来不对'; return }
	if (password.value.length < 6) { errText.value = '密码至少 6 位'; return }
	if (password.value !== confirm.value) { errText.value = '两次输入的密码不一样'; return }

	loading.value = true
	try {
		const res = await signUp(mail, password.value)
		if (res.needConfirm) {
			// 项目开了邮箱确认：先去收件箱点链接，再回来登录
			okText.value = `注册成功了。去 ${res.email} 收件箱点一下确认链接，然后回来登录`
			uni.showToast({ title: '去邮箱点确认链接', icon: 'none' })
		} else {
			okText.value = '注册成功，已经帮你登录了'
			uni.showToast({ title: '注册成功', icon: 'none' })
			setTimeout(() => {
				// 注册即登录（项目关掉了邮箱确认）→ 直接回首页
				uni.reLaunch({ url: '/pages/calendar/index' })
			}, 700)
		}
	} catch (e) {
		errText.value = (e && e.message) || '注册失败'
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

	.auth-ok {
		display: block;
		margin-top: 20rpx;
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--success);
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
