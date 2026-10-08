<template>
	<view class="ios-tabbar">
		<!-- 内层用 glassmorphism + glass-pill，只改变量不覆盖属性 -->
		<view class="ios-tabbar-inner glassmorphism glass-pill">
			<view class="vibrancy-effect"></view>
			<view
				v-for="(item, index) in tabs"
				:key="index"
				class="ios-tabbar-item"
				:class="{ active: current === index }"
				@click="switchTab(index)"
			>
				<view class="tab-icon">
					<uni-icons
						:type="current === index ? item.iconActive : item.icon"
						size="23"
						:color="current === index ? theme.brand : theme.textAux"
					/>
				</view>
				<text class="ios-tabbar-label">{{ item.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'app-tab-bar',
	props: {
		current: { type: Number, default: 0 }
	},
	data() {
		return {
			// 图标颜色走 CSS 变量：uni-icons 的 color 会拼进内联 style，
			// var() 同样生效，蓝色/黑色主题自动跟随；
			// 激活色用 --tab-active（黑金主题下是亮金 #FFD34E，非主金）
			theme: {
				brand: 'var(--tab-active)',
				textAux: 'var(--text-aux)'
			},
			tabs: [
				{ icon: 'calendar', iconActive: 'calendar-filled', text: '分享', path: '/pages/calendar/index' },
				{ icon: 'star', iconActive: 'star-filled', text: '2030', path: '/pages/goals/index' },
				{ icon: 'notification', iconActive: 'notification-filled', text: '干正事', path: '/pages/work/index' }
			]
		}
	},
	methods: {
		switchTab(index) {
			if (this.current === index) return
			uni.reLaunch({ url: this.tabs[index].path })
		}
	}
}
</script>

<style scoped>
	.ios-tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 900;
		padding: 0 24rpx calc(env(safe-area-inset-bottom) + 20rpx);
	}

	/* 只写布局，视觉全部由 glassmorphism 提供 */
	.ios-tabbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-around;
		height: 150rpx;
	}

	.ios-tabbar-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 1;
	}

	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 46rpx;
		transition: transform 0.2s;
	}

	.ios-tabbar-label {
		font-size: 23rpx;
		line-height: 1;
		color: var(--text-aux);
		margin-top: 6rpx;
		transition: color 0.2s;
	}

	.ios-tabbar-item.active .tab-icon { transform: scale(1.1); }
	.ios-tabbar-item.active .ios-tabbar-label { color: var(--brand); font-weight: 600; }
</style>
