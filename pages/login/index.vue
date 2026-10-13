<template>
	<view class="au-page" :class="{ 'theme-thought': isThoughtTheme }" :style="{ '--fs': fsVar }">
		<!-- 背景暂用纯渐变底（照片背景后续再上） -->
		<view class="au-bg">
			<view class="au-bg-shade"></view>
		</view>

		<!-- 手写问候压在背景上 -->
		<view class="au-greet">
			<text class="au-greet-l">你好，</text>
			<text class="au-greet-l">很高兴见到你！</text>
			<view class="au-greet-line"></view>
		</view>

		<!-- 重力球场地：吉祥物在这块区域里自由滚动，手机向右倾它滚向右（正式形象图后续替换） -->
		<view class="au-mascot">
			<ip-mascot src="/static/logo.png" :size="140" :gravity="true" :float="false" :sway="false" :shadow="false" bubble-text="咦？手机歪了！" />
		</view>

		<!-- 底部毛玻璃面板：只有登录（账号由管理员开通，没有注册入口） -->
		<view class="au-panel glassmorphism glass-sheet">
			<view class="au-grab"></view>

			<!-- 被登录闸门踢回来时带 ?expired=1：不然用户不知道自己为什么回到这一页 -->
			<view class="au-notice" v-if="expired">
				<uni-icons type="info-filled" size="15" color="var(--warning)" />
				<text class="au-notice-text">登录状态已过期，重新登录一下就好</text>
			</view>

			<view class="af" :class="{ 'af--focus': focus === 'email', 'af--err': !!err.email }" @click.stop>
				<uni-icons type="person" size="19" :color="focus === 'email' ? 'var(--brand)' : 'var(--text-weak)'" />
				<input
					class="af-input"
					v-model="email"
					type="text"
					inputmode="text"
					placeholder="账号"
					placeholder-class="ph"
					:maxlength="64"
					:focus="emailFocus"
					:adjust-position="true"
					:cursor-spacing="28"
					confirm-type="next"
					@focus="focus = 'email'"
					@blur="onBlur('email')"
					@confirm="toPassword"
				/>
				<!-- 后缀是给用户看的：他只输前面那段，@jack.app 由 toEmail() 自动补上。
				     万一他自己敲了 @（比如用真实邮箱），就把后缀收起来，免得看起来像重复了。 -->
				<text class="af-suffix" v-if="email.indexOf('@') < 0">@jack.app</text>
				<view class="af-tail" v-if="email" @click.stop="onClearEmail">
					<uni-icons type="clear" size="16" color="var(--text-weak)" />
				</view>
			</view>
			<text class="af-err" v-if="err.email">{{ err.email }}</text>

			<view class="af" :class="{ 'af--focus': focus === 'password', 'af--err': !!err.password }" @click.stop>
				<uni-icons type="locked" size="19" :color="focus === 'password' ? 'var(--brand)' : 'var(--text-weak)'" />
				<input
					class="af-input"
					v-model="password"
					:password="!showPwd"
					placeholder="密码"
					placeholder-class="ph"
					:maxlength="64"
					:focus="pwdFocus"
					:adjust-position="true"
					:cursor-spacing="28"
					confirm-type="done"
					@focus="focus = 'password'"
					@blur="onBlur('password')"
					@confirm="onSubmit"
				/>
				<view class="af-tail" @click.stop="showPwd = !showPwd">
					<uni-icons :type="showPwd ? 'eye-filled' : 'eye'" size="19" color="var(--text-weak)" />
				</view>
			</view>

			<text class="af-err" v-if="err.password">{{ err.password }}</text>

			<!-- 忘记密码：本项目不发邮件（免费档的邮件只发给项目成员），没有自助重置这条路 -->
			<view class="au-forgot" @click="onForgot">
				<text class="au-forgot-text">忘记密码？</text>
			</view>

			<view class="au-alert" v-if="err.general">
				<uni-icons type="info-filled" size="15" color="var(--danger)" />
				<text class="au-alert-text">{{ err.general }}</text>
			</view>

			<view class="au-btn" :class="{ 'au-btn--loading': loading }" @click="onSubmit">
				<text class="au-btn-text">{{ btnText }}</text>
			</view>

			<view class="au-legal" @click="agree = !agree">
				<view class="au-cb" :class="{ 'au-cb--on': agree, 'au-cb--hint': cbHint }">
					<uni-icons v-if="agree" type="checkmarkempty" size="11" color="#ffffff" />
				</view>
				<text class="au-legal-text">我已阅读并同意<text class="au-legal-link" @click.stop="openAgreement('terms')">《用户协议》</text>和<text class="au-legal-link" @click.stop="openAgreement('privacy')">《隐私政策》</text></text>
			</view>

			<!-- 备案号拿到真的再填（留空则不渲染，免得页面上挂一串假的） -->
			<text class="au-icp" v-if="ICP">{{ ICP }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { signIn, currentUser } from '@/utils/auth.js'
import ipMascot from '@/components/ip-mascot/ip-mascot.vue'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode } from '@/utils/app-mode.js'
import { fsVar, refreshFontScale } from '@/utils/font-scale.js'

/** 备案号：拿到真的填这里（App 备案后工信部下发的那个） */
const ICP = ''
/** 忘记密码：本项目不发邮件，只能人工改，这里给管理员微信 */
const WECHAT_ID = 'LforovW13'

const email = ref('')
const password = ref('')
const showPwd = ref(false)
const agree = ref(false)
const cbHint = ref(false)
const focus = ref('')
const loading = ref(false)
const expired = ref(false)
const isThoughtTheme = ref(false)

// 键盘「下一步」链路：账号 → 密码
// input 的 focus 是布尔 prop：置 true 聚焦、失焦时置回 false，下次才能再次触发
const emailFocus = ref(false)
const pwdFocus = ref(false)

/** 报错按字段分开：能钉到字段上的长在框下面，钉不住的（跨字段的"账号或密码不对"）才落到按钮上方 */
const err = reactive({ email: '', password: '', general: '' })

const btnText = computed(() => (loading.value ? '登录中…' : '登录'))

function clearErr() {
	err.email = ''
	err.password = ''
	err.general = ''
}

function onBlur(which) {
	focus.value = ''
	if (which === 'email') emailFocus.value = false
	if (which === 'password') pwdFocus.value = false
}

function onClearEmail() {
	email.value = ''
	err.email = ''
}

function toPassword() {
	emailFocus.value = false
	pwdFocus.value = true
}

/**
 * 服务端报错尽量钉到对应字段上。
 * "账号或密码不对"必须先拦掉——它含"账号"二字，不特判就会被钉到账号框上，误导用户去改账号。
 */
function pinError(msg) {
	if (/账号或密码|邮箱或密码/.test(msg)) { err.general = msg; return }
	if (/账号|邮箱/.test(msg)) { err.email = msg; return }
	if (/密码/.test(msg)) { err.password = msg; return }
	err.general = msg
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 账号后缀。
 *
 * Supabase 的账号必须是邮箱格式，但发给用户的账号是 jack-J12 这种短号，
 * 让用户自己去输 "@jack.app" 太蠢了 —— 他只用输前面那段，这里自动补上。
 * 已经带了 @ 的原样放行（万一以后想用真实邮箱登录也不冲突）。
 * 域名跟 supabase/admin.html 里建号用的那个保持一致。
 */
const ACCOUNT_DOMAIN = 'jack.app'

function toEmail(v) {
	const s = String(v || '').trim()
	if (!s) return ''
	return s.indexOf('@') >= 0 ? s : s + '@' + ACCOUNT_DOMAIN
}

function validate() {
	clearErr()
	cbHint.value = false
	const mail = toEmail(email.value)
	if (!mail) { err.email = '先填账号'; return false }
	if (!EMAIL_RE.test(mail)) { err.email = '账号格式看起来不对'; return false }
	if (!password.value) { err.password = '先填密码'; return false }
	if (!agree.value) { cbHint.value = true; return false }
	return true
}

function openAgreement(tab) {
	uni.navigateTo({ url: `/pages/agreement/index?tab=${tab}` })
}

/**
 * 忘记密码：这里没有「发邮件重置」那条路，只能找管理员人工改。
 */
function onForgot() {
	uni.showModal({
		title: '忘记密码',
		content: `请联系管理员重置密码（微信 ${WECHAT_ID}）`,
		confirmText: '复制微信号',
		cancelText: '知道了',
		success: (res) => {
			if (!res.confirm) return
			uni.setClipboardData({
				data: WECHAT_ID,
				success: () => uni.showToast({ title: '微信号已复制', icon: 'none' }),
				fail: () => uni.showToast({ title: `复制失败，手动记一下：${WECHAT_ID}`, icon: 'none' })
			})
		}
	})
}

async function onSubmit() {
	if (loading.value) return
	if (!validate()) {
		if (cbHint.value) uni.showToast({ title: '先勾选下面的协议', icon: 'none' })
		return
	}

	loading.value = true
	// 用户只输了 jack-J12 的话，这里补成 jack-J12@jack.app
	const mail = toEmail(email.value)
	try {
		await signIn(mail, password.value)
		const u = currentUser()
		uni.showToast({ title: u && u.email ? `已登录 ${u.email}` : '登录成功', icon: 'none' })
		setTimeout(() => {
			// 登录后统一回首页 tab：守卫是 reLaunch 过来的，栈里没有"上一页"可退
			uni.reLaunch({ url: '/pages/calendar/index' })
		}, 600)
	} catch (e) {
		pinError((e && e.message) || '登录失败')
	} finally {
		loading.value = false
	}
}

onLoad((options) => {
	expired.value = !!(options && options.expired)
	// 本 App 只有登录：账号由管理员在后台开通（pages 里没有注册页，服务端也关了注册）
	isThoughtTheme.value = getAppMode() === CONTENT_MODE.THOUGHT
	refreshFontScale()
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
		position: relative;
		/* --vh：H5 的真实可视高度（地址栏收放时 100vh 会偏大）；App 端回落 1vh = 原行为 */
		min-height: calc(var(--vh, 1vh) * 100);
		display: flex;
		flex-direction: column;
		/* 面板贴底：软键盘把窗口压短时，面板跟着上移（面板在文档流里，不是 fixed） */
		justify-content: flex-end;
		background: #0B0B0F;
	}

	/* ===== 照片底 ===== */
	.au-bg {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 0;
		overflow: hidden;
	}

	.au-bg-img {
		width: 100%;
		height: 100%;
	}

	.au-bg-shade {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: linear-gradient(180deg,
			rgba(12, 20, 34, 0.42) 0%,
			rgba(12, 20, 34, 0.06) 34%,
			rgba(12, 20, 34, 0.55) 62%,
			rgba(12, 20, 34, 0.86) 100%);
	}

	.theme-thought .au-bg-shade {
		background: linear-gradient(180deg,
			rgba(6, 6, 10, 0.58) 0%,
			rgba(6, 6, 10, 0.24) 34%,
			rgba(6, 6, 10, 0.66) 62%,
			rgba(6, 6, 10, 0.9) 100%);
	}

	/* ===== 手写问候 ===== */
	.au-greet {
		position: fixed;
		left: 52rpx;
		top: calc(var(--status-bar-height, 0px) + 96rpx);
		z-index: 2;
		display: flex;
		flex-direction: column;
	}

	.au-greet-l {
		font-family: 'NailaoHand', 'PingFang SC', sans-serif;
		font-size: calc(52rpx * var(--fs, 1));
		color: #ffffff;
		line-height: 1.36;
		text-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.35);
	}

	.au-greet-line {
		width: 220rpx;
		height: 5rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.65);
		margin-top: 18rpx;
		transform: rotate(-2deg);
	}

	/* ===== 重力小吉祥物 =====
	   活动区 = 问候语下方到登录面板之间的整块空白（flex:1 自动撑满，不写死高度，
	   换机型/换屏高都不用重调）；pointer-events 只给吉祥物本体，外层不挡面板点击 */
	.au-mascot {
		position: relative;
		flex: 1;
		min-height: 0;
		margin: calc(var(--status-bar-height, 0px) + 300rpx) 24rpx 0;
		z-index: 2;
		pointer-events: none;
	}

	.au-mascot :deep(.ip-mascot) {
		pointer-events: auto;
	}

	/* ===== 底部玻璃面板 =====
	   毛玻璃视觉全部由 .glassmorphism / .glass-sheet 提供（UI 文档第 0 条），
	   这里只改 --glass-* 变量，不覆盖它的任何视觉属性。 */
	.au-panel {
		position: relative;
		z-index: 3;
		/* 不再用 margin-top: auto 贴底：auto margin 会吃掉全部剩余空间，
		   让上面 .au-mascot 的 flex:1 撑不开（规范里 auto margin 优先于 flex-grow）。
		   贴底由 .au-page 的 justify-content: flex-end 负责。 */
		--glass-bg: rgba(255, 255, 255, 0.88);
		--glass-blur: 22px;
		--glass-saturate: 170%;
		--glass-border: rgba(255, 255, 255, 0.9);
		--glass-radius: 64rpx 64rpx 0 0;
		--glass-shadow: 0 -28rpx 88rpx rgba(20, 40, 80, 0.18);
		padding: 24rpx 48rpx calc(env(safe-area-inset-bottom) + 44rpx);
	}

	/* 暗色（思考实验）主题：圆角跟 App.vue 的 .glass-sheet 走，只换底色与投影 */
	.au-page.theme-thought .au-panel {
		--glass-bg: rgba(20, 20, 25, 0.9);
		--glass-shadow: 0 -28rpx 88rpx rgba(0, 0, 0, 0.5);
	}

	.au-grab {
		width: 88rpx;
		height: 8rpx;
		border-radius: 999rpx;
		background: #c9d5e6;
		margin: 0 auto 24rpx;
	}

	.theme-thought .au-grab {
		background: #3A3A44;
	}

	/* ===== 登录态过期提示 ===== */
	.au-notice {
		display: flex;
		flex-direction: row;
		align-items: center;
		background: rgba(245, 158, 11, 0.14);
		border-radius: 18rpx;
		padding: 16rpx 20rpx;
		margin-bottom: 20rpx;
	}

	.au-notice-text {
		font-size: calc(23rpx * var(--fs, 1));
		color: var(--warning);
		margin-left: 10rpx;
	}

	/* ===== 输入 ===== */
	.af {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100rpx;
		background: #ffffff;
		border: 2rpx solid transparent;
		border-radius: 999rpx;
		padding: 0 30rpx;
		margin-bottom: 22rpx;
		box-shadow: 0 8rpx 24rpx rgba(31, 45, 61, 0.08);
	}

	.theme-thought .af {
		background: #1A1A1F;
		border-color: #2A2A32;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);
	}

	.af--focus {
		border-color: var(--brand);
	}

	.af--err {
		border-color: var(--danger);
	}

	.af-input {
		flex: 1;
		height: 62rpx;
		margin-left: 20rpx;
		font-size: calc(29rpx * var(--fs, 1));
		color: var(--text);
		background: transparent;
		border: none;
		padding: 0;
	}

	.af-suffix {
		flex-shrink: 0;
		margin-left: 8rpx;
		margin-right: 10rpx;
		font-size: calc(27rpx * var(--fs, 1));
		color: var(--text-weak);
		letter-spacing: 0.4rpx;
	}

	/* 聚焦时后缀跟着提亮一点，让它看起来是"提示"而不是"已输入的内容" */
	.af--focus .af-suffix {
		color: var(--text-aux);
	}

	.af-tail {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-right: -12rpx;
	}

	.af-err {
		display: block;
		font-size: calc(23rpx * var(--fs, 1));
		color: var(--danger);
		line-height: 1.5;
		margin: -10rpx 8rpx 16rpx 34rpx;
	}

	.au-forgot {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		padding: 0 14rpx;
		margin: -6rpx 0 6rpx;
	}

	.au-forgot-text {
		font-size: calc(25rpx * var(--fs, 1));
		color: var(--brand);
	}

	/* ===== 跨字段报错 ===== */
	.au-alert {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin: 20rpx 8rpx 0;
	}

	.au-alert-text {
		font-size: calc(24rpx * var(--fs, 1));
		color: var(--danger);
		line-height: 1.5;
		margin-left: 10rpx;
	}

	/* ===== 主按钮 ===== */
	.au-btn {
		height: 104rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 28rpx;
		background: linear-gradient(135deg, #5B9CFF 0%, #3A83F7 50%, #2E6BE6 100%);
		box-shadow: 0 16rpx 36rpx rgba(58, 131, 247, 0.32);
	}

	.theme-thought .au-btn {
		background: linear-gradient(135deg, #FFF0B0 0%, #FFD34E 45%, #E8B341 100%);
		box-shadow: 0 16rpx 36rpx rgba(232, 179, 65, 0.26);
	}

	/* 提交中：变淡且不再接受点击（onSubmit 里另有 loading 早退兜底） */
	.au-btn--loading {
		opacity: 0.7;
		pointer-events: none;
	}

	.au-btn-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.theme-thought .au-btn-text {
		color: #241A05;
	}

	/* ===== 协议 ===== */
	.au-legal {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-top: 28rpx;
	}

	.au-cb {
		width: 32rpx;
		height: 32rpx;
		border-radius: 10rpx;
		border: 2rpx solid var(--text-weak);
		flex-shrink: 0;
		margin: 2rpx 12rpx 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.au-cb--on {
		background: var(--brand);
		border-color: var(--brand);
	}

	/* 没勾就点提交：框闪一下红，告诉用户卡在哪 */
	.au-cb--hint {
		border-color: var(--danger);
	}

	.au-legal-text {
		flex: 1;
		font-size: calc(23rpx * var(--fs, 1));
		color: var(--text-aux);
		line-height: 1.6;
	}

	.au-legal-link {
		color: var(--brand);
	}

	.au-icp {
		display: block;
		font-size: calc(21rpx * var(--fs, 1));
		color: var(--text-weak);
		text-align: center;
		margin-top: 20rpx;
	}

	/* ===== 设备尺寸适配 =====
	   这一页不是 .page 布局（照片底 + 固定问候/吉祥物 + 贴底面板），
	   所以宽屏收列、矮屏收留白要单独写一份。 */

	/* 宽屏（平板 / 折叠屏展开 / 桌面 H5）：面板收进居中列，
	   固定在屏幕上的问候语与吉祥物也跟着挪到同一列里，不然会飘到屏幕左边缘 */
	@media (min-width: 600px) {
		.au-panel {
			width: 100%;
			max-width: var(--adapt-content-max, 560px);
			/* view 默认是 content-box：不改成 border-box 的话 max-width 只管内容盒，
			   左右内边距会把面板撑出内容列 */
			box-sizing: border-box;
			margin-left: auto;
			margin-right: auto;
		}

		.au-greet {
			left: calc(50% - var(--adapt-content-max, 560px) / 2 + 52rpx);
		}

		.au-mascot {
			margin-left: calc(50% - var(--adapt-content-max, 560px) / 2 + 24rpx);
			margin-right: calc(50% - var(--adapt-content-max, 560px) / 2 + 24rpx);
		}
	}

	/* 矮屏（小屏机、横屏手机）：面板本身就要占掉大半屏，
	   问候语往上收、面板内边距收一档，把可视高度让给输入框 */
	@media (max-height: 700px) {
		.au-greet {
			top: calc(var(--status-bar-height, 0px) + 52rpx);
		}

		.au-greet-l {
			font-size: calc(42rpx * var(--fs, 1));
		}

		.au-panel {
			padding: 20rpx 44rpx calc(env(safe-area-inset-bottom) + 28rpx);
		}
	}

	/* 更矮（横屏手机）：吉祥物的活动区会被面板整块盖住，直接收掉 */
	@media (max-height: 640px) {
		.au-mascot {
			display: none;
		}
	}
</style>
