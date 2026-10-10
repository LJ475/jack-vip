<script>
	import { applyLockScreenFlags } from './api/countdown.js'
	import { scheduleDailyReminders } from './api/daily-reminder.js'
	import { resetAppMode } from './utils/app-mode.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 三个 tab 页声明在 pages.json 的 tabBar 里，是为了让 switchTab 缓存页面（切页不再销毁重建）；
			// 底部那条栏仍由 components/app-tab-bar 自己画，原生这条开屏即隐藏：
			// App 端隐藏后 tabBarView.height 取 0（不占布局），H5 端 shown=false 直接不渲染 DOM。
			uni.hideTabBar({ animation: false })
			// 每次冷启动默认进入「图片分享」（蓝色主题）；模式仅在本次会话内跨页保持
			resetAppMode()
		},
		onShow: function() {
			console.log('App Show')
			// 锁屏亮屏 flag 在进程被杀、系统重建 Activity 后会丢失，每次回前台补设
			applyLockScreenFlags()
			// 每日更新提醒的本地通知按条调度，回前台时检查覆盖情况自动续期
			scheduleDailyReminders()
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* ============================================================
	 * 全局样式（来自《手机端 UI开发文档.md》）
	 * Design Tokens + .glassmorphism 毛玻璃核心类 + 公共组件样式
	 * 规则：毛玻璃视觉全部由 .glassmorphism 提供，
	 * 局部只允许改 --glass-* 变量，禁止覆盖其视觉属性。
	 * ============================================================ */

	/* ===== 滚动条（细 + 透明轨道 + 半透明主题色滑块） =====
	   滚动条属于根元素，取不到 page/.theme-thought 上的变量，
	   所以这里在 :root 上单独放一份，黑色主题由 JS 给 html 挂
	   .theme-thought 类切换（utils/app-mode.js 的 syncRootTheme）。 */
	:root {
		--sb-thumb: rgba(58, 131, 247, 0.35);
		--sb-thumb-hover: rgba(58, 131, 247, 0.55);
	}

	:root.theme-thought {
		--sb-thumb: rgba(232, 179, 65, 0.32);
		--sb-thumb-hover: rgba(232, 179, 65, 0.55);
	}

	::-webkit-scrollbar {
		width: 4px;
		height: 4px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background: var(--sb-thumb);
		border-radius: 999px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: var(--sb-thumb-hover);
	}

	/* Firefox */
	html {
		scrollbar-width: thin;
		scrollbar-color: var(--sb-thumb) transparent;
	}

	/* 黑色主题下 overscroll 回弹露出的根背景也翻黑（与主题底色一致） */
	html.theme-thought {
		background: #0B0B0F;
	}

	/* 切页面会先画出页面外壳的底色，而 page 的浅蓝渐变在 H5 编译到 uni-page-body、
	   在 App 端仍是 page，暗色只覆盖在页面根元素上（在这层之内），所以切页/回弹会闪白。 */
	html.theme-thought page,
	html.theme-thought uni-page-body,
	html.theme-thought body {
		background: #0B0B0F;
	}

	page {
		/* ===== 品牌色系（图片分享 = 蓝色主题） ===== */
		--brand: #3A83F7;
		--brand-hover: #2D73E6;
		--brand-light: rgba(58, 131, 247, 0.12);
		--brand-glow: rgba(58, 131, 247, 0.25);
		--brand-glow-soft: rgba(58, 131, 247, 0.18);
		/* 品牌色上的文字/图标颜色（随主题翻转） */
		--on-brand: #FFFFFF;
		/* 底部导航激活图标色（黑金主题下用点缀浅金 #FFD58A，比主金更亮） */
		--tab-active: var(--brand);

		/* ===== 文字四级灰 ===== */
		--text: #333333;
		--text-secondary: #5C6C8D;
		--text-aux: #8994A9;
		--text-weak: #B3BDCC;

		/* ===== 语义色 ===== */
		--success: #27C68A;
		--warning: #F59E0B;
		--danger: #FF5F6D;

		/* ===== 圆角梯度（非毛玻璃元素用） ===== */
		--radius-xl: 48rpx;
		--radius-lg: 40rpx;
		--radius-md: 28rpx;
		--radius-sm: 20rpx;

		/* ===== 分割线 / 描边 ===== */
		--divider: rgba(23, 33, 58, 0.06);
		--border-soft: rgba(23, 33, 58, 0.1);

		/* ===== 场景色（随主题翻转的局部场景） ===== */
		--hero-bg: linear-gradient(135deg, #edf4ff, #ffffff);
		--hero-border: rgba(255, 255, 255, 0.55);
		--mask-bg: rgba(23, 33, 58, 0.35);
		--btn-ghost-bg: #FFFFFF;
		--focus-field-bg: rgba(255, 255, 255, 0.78);
		--focus-border: rgba(58, 131, 247, 0.55);
		--wheel-bg: rgba(255, 255, 255, 0.55);
		--bubble-bg: rgba(255, 255, 255, 0.94);
		/* 骨架屏：底色 + 扫光高光 */
		--sk-base: rgba(23, 33, 58, 0.07);
		--sk-hi: rgba(255, 255, 255, 0.85);
		/* 2030 总览卡场景色（浅色=天空蓝渐变） */
		--overview-bg: linear-gradient(135deg, #D8E8FF 0%, #ECF4FF 55%, #F6FAFF 100%);
		--overview-border: rgba(255, 255, 255, 0.75);
		--overview-hole: #E9F1FF;

		/* 页面底：浅蓝对角渐变 */
		background: linear-gradient(135deg, #edf4ff, #f8fbff);
		height: 100%;
		font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif;
		font-size: 28rpx;
		color: var(--text);
		-webkit-font-smoothing: antialiased;
	}

	/* ============================================================
	 * 365天思考实验主题（Obsidian Gold 曜石黑金·纯金版）
	 * 设计原则：90% 黑灰 + 8% 暖金 + 2% 金色高光；
	 * 三级卡片层级 #141419 / #1A1A1F / #22232A 建立空间感，
	 * 边框统一低对比 #2A2A32；金色用金属感纯金（非香槟黄），
	 * CTA/胶囊带扫光反光、卡片带对角反光条。
	 * ============================================================ */
	.theme-thought {
		/* 金色体系：主金 #E8B341（金属金）、亮金 #FFD34E、高光 #FFF0B0、深金 #A97B1E */
		--brand: #E8B341;
		--brand-hover: #FFCE45;
		--brand-light: rgba(232, 179, 65, 0.13);
		--brand-glow: rgba(232, 179, 65, 0.22);
		--brand-glow-soft: rgba(232, 179, 65, 0.12);
		--on-brand: #241A05;
		--gold-light: #FFD34E;
		--gold-dark: #A97B1E;
		--gold-highlight: #FFF0B0;

		/* 文字：主 #E8E8EA / 次 #A3A3AA / 弱 #686870，不用纯白 */
		--text: #E8E8EA;
		--text-secondary: #A3A3AA;
		--text-aux: #85858D;
		--text-weak: #686870;

		/* 语义色提亮一档，保证黑底可读；warning 归入金调 */
		--success: #34DBA2;
		--warning: #E8B341;
		--danger: #FF7B87;

		/* 分割线 / 描边：低对比 #2A2A32，不用金色描边 */
		--divider: #2A2A32;
		--border-soft: #2A2A32;

		/* 场景色（Surface 3 = 浮动元素 #22232A） */
		--hero-bg: #141419;
		--hero-border: #2A2A32;
		--mask-bg: rgba(0, 0, 0, 0.65);
		--btn-ghost-bg: rgba(34, 35, 42, 0.92);
		--focus-field-bg: rgba(255, 255, 255, 0.06);
		--focus-border: rgba(169, 123, 30, 0.6);
		--wheel-bg: rgba(255, 255, 255, 0.04);
		--bubble-bg: rgba(34, 35, 42, 0.98);
		/* 骨架屏跟着翻黑，避免暗色下骨架本身成一次闪白 */
		--sk-base: rgba(255, 255, 255, 0.055);
		--sk-hi: rgba(232, 179, 65, 0.16);
		/* 2030 总览卡场景色（黑金=暗色山峦金晖；注意值必须写成单行——多行声明会被 uni 编译器静默丢弃） */
		--overview-bg: radial-gradient(130% 100% at 88% 0%, rgba(232, 179, 65, 0.3) 0%, rgba(232, 179, 65, 0.07) 42%, transparent 65%), linear-gradient(160deg, #262012 0%, #141419 75%);
		--overview-border: rgba(232, 179, 65, 0.22);
		--overview-hole: #1A1610;

		/* 底部导航激活图标：亮金 */
		--tab-active: #FFD34E;

		/* 页面级组件的主题变量（页面 :deep 规则按变量取色，避免选择器优先级/编译问题） */
		--cal-content-bg: #1A1A1F;
		--cal-switch-bg: rgba(20, 20, 25, 0.88);

		/* 页面底：#0B0B0F 暗色渐变 + 顶部极弱金色环境光（≤0.12，不做霓虹） */
		background:
			radial-gradient(90% 40% at 50% 0%,
				rgba(232, 179, 65, 0.09) 0%, rgba(232, 179, 65, 0.02) 45%, transparent 70%),
			linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
	}

	/* 毛玻璃深色参数（只改 --glass-* 变量，符合 UI 文档规则）：
	   一级卡片 #141419、边框 #2A2A32；阴影带一条顶部金属反光边缘 */
	.theme-thought .glassmorphism {
		--glass-bg: rgba(20, 20, 25, 0.88);
		--glass-border: #2A2A32;
		--glass-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.35),
			inset 0 1rpx 0 rgba(255, 240, 200, 0.12);
		--glass-shadow-hover: 0 12rpx 42rpx rgba(0, 0, 0, 0.45),
			inset 0 1rpx 0 rgba(255, 240, 200, 0.16);
		--glass-radius: 52rpx;
	}

	/* 层级越小圆角越小：胶囊 999px、输入框 14px、弹层跟随大卡片 */
	.theme-thought .glass-pill {
		--glass-radius: 999px;
	}

	.theme-thought .glass-sheet {
		--glass-radius: 52rpx 52rpx 0 0;
	}

	.theme-thought .glass-input {
		--glass-bg: rgba(255, 255, 255, 0.06);
		--glass-radius: 28rpx;
	}

	/* 卡片反光：两条对角弱光带扫过玻璃面（替换默认的径向光） */
	.theme-thought .glassmorphism .vibrancy-effect {
		background:
			linear-gradient(115deg,
				transparent 12%, rgba(255, 240, 200, 0.05) 22%, transparent 34%),
			linear-gradient(115deg,
				transparent 60%, rgba(255, 240, 200, 0.035) 72%, transparent 84%);
	}

	/* 信息标签：Surface 3 底 + 亮金文字（柔和描边、低调） */
	.theme-thought .tag-primary {
		background: rgba(34, 35, 42, 0.9);
		color: var(--gold-light);
		box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.06);
	}

	.theme-thought .tag-info {
		background: rgba(34, 35, 42, 0.9);
		color: var(--text-secondary);
	}

	/* CTA / 主按钮：金属金三段渐变 + 周期性扫光反光 */
	.theme-thought .btn-primary {
		position: relative;
		overflow: hidden;
		background: linear-gradient(135deg, #FFF0B0 0%, #FFD34E 45%, #E8B341 100%);
	}

	.theme-thought .btn-primary:active {
		background: linear-gradient(135deg, #FFD34E 0%, #E8B341 100%);
	}

	.theme-thought .btn-primary::after {
		content: '';
		position: absolute;
		top: -20%;
		left: 0;
		width: 34%;
		height: 140%;
		background: linear-gradient(105deg,
			transparent, rgba(255, 255, 255, 0.42) 50%, transparent);
		transform: skewX(-22deg) translateX(-220%);
		animation: gold-sheen 3.8s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes gold-sheen {
		0%, 55% { transform: skewX(-22deg) translateX(-220%); }
		80%, 100% { transform: skewX(-22deg) translateX(420%); }
	}

	/* ===== 通用扫光反光类（.sheen） =====
	   黑金主题下挂到任意按钮/胶囊/选中态上，复用与 .btn-primary 一致的
	   周期扫光；只叠加掠过的光带、不改底色，浅色（蓝色）主题不生效。 */
	.theme-thought .sheen {
		position: relative;
		overflow: hidden;
	}

	.theme-thought .sheen::after {
		content: '';
		position: absolute;
		top: -20%;
		left: 0;
		width: 34%;
		height: 140%;
		background: linear-gradient(105deg,
			transparent, rgba(255, 255, 255, 0.4) 50%, transparent);
		transform: skewX(-22deg) translateX(-220%);
		animation: gold-sheen 3.8s ease-in-out infinite;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-thought .btn-primary::after,
		.theme-thought .sheen::after {
			display: none;
		}
	}

	/* 底部导航：选中亮金 + 极弱金色 Glow；未选中 #77777F */
	.theme-thought .ios-tabbar-item .ios-tabbar-label {
		color: #77777F;
	}

	.theme-thought .ios-tabbar-item.active .ios-tabbar-label {
		color: var(--gold-light);
	}

	.theme-thought .ios-tabbar-item.active .tab-icon {
		filter: drop-shadow(0 0 10rpx rgba(232, 179, 65, 0.25));
	}

	/* ===== 页面容器 =====
	   顶部 = 状态栏高度 + 16rpx 呼吸位（H5 下状态栏变量为 0，也能保证不贴顶） */
	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 16rpx) 24rpx 24rpx 24rpx;
	}

	/* 有悬浮 TabBar 的页面额外加这个类 */
	.page-tabbar {
		padding-bottom: calc(240rpx + env(safe-area-inset-bottom));
	}

	/* ===== 毛玻璃核心类 ===== */
	.glassmorphism {
		/* 可配置参数（默认值适配浅色渐变背景） */
		--glass-bg: rgba(255, 255, 255, 0.58);
		--glass-blur: 16px;
		--glass-saturate: 160%;
		--glass-border: rgba(255, 255, 255, 0.65);
		--glass-radius: 32rpx;
		--glass-shadow: 0 8rpx 32rpx rgba(31, 45, 61, 0.12);
		--glass-shadow-hover: 0 12rpx 42rpx rgba(31, 45, 61, 0.16);
		--glass-color: var(--text);

		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
		-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
		border: 1px solid var(--glass-border);
		border-radius: var(--glass-radius);
		box-shadow: var(--glass-shadow);
		color: var(--glass-color);
		position: relative;
		overflow: hidden;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* 只在支持 hover 的设备上做悬浮放大 */
	@media (hover: hover) {
		.glassmorphism:hover {
			transform: scale(1.02);
			box-shadow: var(--glass-shadow-hover);
		}
	}

	/* 不支持 backdrop-filter 的环境：提高背景不透明度 */
	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.glassmorphism {
			--glass-bg: rgba(255, 255, 255, 0.9);
		}

		.theme-thought .glassmorphism {
			--glass-bg: rgba(20, 20, 25, 0.98);
		}
	}

	/* Apple Vibrancy 增强层（可选） */
	.glassmorphism .vibrancy-effect {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center,
			rgba(255, 255, 255, 0.35) 0%, transparent 70%);
		mix-blend-mode: overlay;
		pointer-events: none;
		border-radius: inherit;
	}

	/* ===== 常用毛玻璃形态修饰类（只改变量） ===== */
	.glass-pill { --glass-radius: 999px; }

	.glass-sheet { --glass-radius: 32rpx 32rpx 0 0; }

	.glass-input {
		--glass-bg: rgba(255, 255, 255, 0.75);
		--glass-radius: 24rpx;
		--glass-shadow: 0 4rpx 16rpx rgba(31, 45, 61, 0.06);
		--glass-blur: 12px;
	}

	/* ===== 卡片内部结构（只写布局） ===== */
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 28rpx;
		border-bottom: 1rpx solid var(--divider);
		position: relative;
		z-index: 1;
	}

	.card-title { font-weight: 600; color: var(--text); font-size: 30rpx; }

	.card-body { padding: 28rpx; position: relative; z-index: 1; }

	/* ===== 按钮 ===== */
	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 80rpx;
		padding: 0 32rpx;
		border-radius: var(--radius-md);
		font-size: 28rpx;
		line-height: 1;
		box-sizing: border-box;
		border: none;
		margin: 0;
	}

	.btn::after { border: none; }

	.btn-lg { height: 92rpx; font-size: 32rpx; }
	.btn-sm { height: 56rpx; padding: 0 24rpx; font-size: 24rpx; }

	.btn-primary        { background: var(--brand); color: var(--on-brand); }
	.btn-primary:active { background: var(--brand-hover); }
	.btn-success        { background: var(--success); color: #fff; }
	.btn-ghost          { background: var(--btn-ghost-bg); color: var(--text-secondary); border: 1rpx solid var(--border-soft); }
	.btn-plain          { background: transparent; color: var(--brand); border: 1rpx solid var(--brand); }
	.btn-danger-plain   { background: transparent; color: var(--danger); border: 1rpx solid var(--danger); }
	.btn-glow           { box-shadow: 0 16rpx 40rpx var(--brand-glow); }
	.btn-disabled       { opacity: 0.5; }
	.btn-loading        { opacity: 0.7; }
	.full-btn           { width: 100%; }

	/* ===== Tag 状态标签 ===== */
	.tag {
		display: inline-flex;
		align-items: center;
		height: 44rpx;
		padding: 0 16rpx;
		border-radius: var(--radius-sm);
		font-size: 22rpx;
		line-height: 1;
	}

	.tag-info    { background: rgba(137, 148, 169, 0.12); color: var(--text-secondary); }
	.tag-success { background: rgba(39, 198, 138, 0.12);  color: var(--success); }
	.tag-warning { background: rgba(245, 158, 11, 0.12);  color: var(--warning); }
	.tag-primary { background: var(--brand-light);        color: var(--brand); }

	/* ===== 空状态 ===== */
	.empty {
		text-align: center;
		padding: 80rpx 0;
		color: var(--text-aux);
		font-size: 26rpx;
	}

	/* ===== 工具类 ===== */
	.ph     { color: var(--text-weak); }
	.flex-1 { flex: 1; }
	.mb-16  { margin-bottom: 16rpx; }
	.mt-16  { margin-top: 16rpx; }
	.mt-24  { margin-top: 24rpx; }

	/* ============================================================
	 * 系统弹层重订样式（picker 选择弹窗 / ActionSheet / Modal 确认框）
	 * uni-h5 内置默认样式与设计语言不符（直角白板、系统蓝/微信绿），
	 * 这里全局覆盖成 App 的圆角、文字灰阶与品牌色。
	 * 弹层 DOM 可能挂在 page 之外，取不到 page 上的 CSS 变量，
	 * 因此浅色全部写蓝色主题字面值；深色（思考实验）挂 html.theme-thought
	 * （该类由 utils/app-mode.js 的 syncRootTheme 挂到根节点，覆盖两种挂载位置）。
	 * ============================================================ */

	/* ---- picker 日期/选择弹窗 ----
	   实测：uni-h5 把弹层挂在 <uni-app> 下（.uni-picker-container → UNI-APP → BODY），
	   页面里那个 <uni-picker> 标签并不包含它，所以旧写法 `uni-picker .uni-picker-container …`
	   永远不匹配；这里改用 .uni-app 前缀，并保证比 uni 自带规则多一级，才盖得住。 */
	uni-app .uni-picker-container .uni-picker-toggle.uni-picker-custom {
		border-radius: 32rpx 32rpx 0 0;
		padding-bottom: env(safe-area-inset-bottom);
	}

	uni-app .uni-picker-container .uni-picker-header .uni-picker-action.uni-picker-action-cancel {
		color: #8994A9;
		font-size: 17px;
	}

	uni-app .uni-picker-container .uni-picker-header .uni-picker-action.uni-picker-action-confirm {
		color: #3A83F7;
		font-size: 17px;
		font-weight: 600;
	}

	uni-app .uni-picker-container .uni-picker-header:after {
		border-bottom-color: rgba(23, 33, 58, 0.06);
	}

	/* 滚轮区：uni 自带白底，不跟着翻黑就会在暗色主题下露出一块白（.uni-picker-content） */
	uni-app .uni-picker-container .uni-picker-content {
		background-color: #FFFFFF;
	}

	uni-app .uni-picker-container .uni-picker-view-content .uni-picker-item {
		color: #333333;
	}

	uni-app .uni-picker-container .uni-picker-view-indicator:before,
	uni-app .uni-picker-container .uni-picker-view-indicator:after {
		border-color: rgba(23, 33, 58, 0.08);
	}

	/* 宽屏（≥500px 视口）picker 变居中对话框：四角都圆 */
	@media screen and (min-width: 500px) and (min-height: 500px) {
		uni-app .uni-picker-container .uni-picker-toggle.uni-picker-custom {
			border-radius: 32rpx;
		}

		uni-app .uni-picker-container .uni-picker-content {
			border-radius: 0 0 32rpx 32rpx;
		}
	}

	/* ---- ActionSheet（··· 更多菜单） ---- */
	uni-actionsheet .uni-actionsheet__menu,
	uni-actionsheet .uni-actionsheet__action {
		border-radius: 32rpx;
		background-color: #FFFFFF;
	}

	uni-actionsheet .uni-actionsheet .uni-actionsheet__cell {
		padding: 14px 6px;
		font-size: 17px;
		color: #333333;
	}

	uni-actionsheet .uni-actionsheet .uni-actionsheet__cell:active {
		background-color: #F0F4FA;
	}

	uni-actionsheet .uni-actionsheet .uni-actionsheet__cell:before {
		border-top-color: rgba(23, 33, 58, 0.06);
	}

	/* ---- Modal 确认框 ---- */
	uni-modal .uni-modal {
		border-radius: 28rpx;
		background-color: #FFFFFF;
	}

	uni-modal .uni-modal .uni-modal__title {
		font-weight: 600;
		color: #333333;
	}

	uni-modal .uni-modal .uni-modal__bd {
		color: #5C6C8D;
	}

	uni-modal .uni-modal .uni-modal__ft:after,
	uni-modal .uni-modal .uni-modal__btn:after {
		border-color: rgba(23, 33, 58, 0.06);
	}

	uni-modal .uni-modal .uni-modal__btn:active {
		background-color: #F0F4FA;
	}

	/* 取消键 uni 会写内联色（黑金面板上会变成看不见），这里用 !important 兜住；
	   主按钮不覆盖，保留调用方传的 confirmColor（删除=红） */
	uni-modal .uni-modal .uni-modal__btn.uni-modal__btn_default {
		color: #8994A9 !important;
	}

	uni-modal .uni-modal .uni-modal__btn.uni-modal__btn_primary {
		color: #3A83F7;
	}

	/* ---- 深色（思考实验/黑金）主题下的系统弹层 ----
	   html.theme-thought 由 utils/app-mode.js 的 syncRootTheme 挂在根节点，是弹层的真祖先 */
	html.theme-thought uni-app .uni-picker-container .uni-picker-toggle.uni-picker-custom,
	html.theme-thought uni-app .uni-picker-container .uni-picker-content {
		background-color: #141419;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-view-content .uni-picker-item {
		color: #E8E8EA;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-header .uni-picker-action.uni-picker-action-cancel {
		color: #85858D;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-header .uni-picker-action.uni-picker-action-confirm {
		color: #E8B341;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-header:after {
		border-bottom-color: #2A2A32;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-view-indicator:before,
	html.theme-thought uni-app .uni-picker-container .uni-picker-view-indicator:after {
		border-color: #2A2A32;
	}

	html.theme-thought uni-app .uni-picker-container .uni-picker-view-mask {
		background-image: linear-gradient(180deg, rgba(20, 20, 25, 0.95), rgba(20, 20, 25, 0.55)),
			linear-gradient(0deg, rgba(20, 20, 25, 0.95), rgba(20, 20, 25, 0.55));
	}

	html.theme-thought uni-actionsheet .uni-actionsheet__menu,
	html.theme-thought uni-actionsheet .uni-actionsheet__action {
		background-color: #1A1A1F;
	}

	html.theme-thought uni-actionsheet .uni-actionsheet .uni-actionsheet__cell {
		color: #E8E8EA;
	}

	html.theme-thought uni-actionsheet .uni-actionsheet .uni-actionsheet__cell:active {
		background-color: #22232A;
	}

	html.theme-thought uni-actionsheet .uni-actionsheet .uni-actionsheet__cell:before {
		border-top-color: #2A2A32;
	}

	html.theme-thought uni-modal .uni-modal {
		background-color: #1A1A1F;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__title {
		color: #E8E8EA;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__bd {
		color: #A3A3AA;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__btn:active {
		background-color: #22232A;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__btn.uni-modal__btn_default {
		color: #85858D !important;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__btn.uni-modal__btn_primary {
		color: #E8B341;
	}

	html.theme-thought uni-modal .uni-modal .uni-modal__ft:after,
	html.theme-thought uni-modal .uni-modal .uni-modal__btn:after {
		border-color: #2A2A32;
	}
</style>
