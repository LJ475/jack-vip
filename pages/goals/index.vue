<template>
	<view class="page page-tabbar" :class="{ 'theme-thought': isThoughtTheme }">

		<!-- ① 目标进度总览卡（截止日期可自定义：点时间范围行修改） -->
		<view class="overview-card">
			<view class="overview-top">
				<view class="overview-left">
					<text class="overview-label">距离{{ endYear }}还有</text>
					<view class="overview-days">
						<text class="days-num">{{ daysLeftText }}</text>
						<text class="days-unit">天</text>
						<countdown-tick class="days-tick" :end-ts="endTs" />
					</view>
				</view>
				<view class="ring-wrap">
					<view class="ring" :style="{ background: ringBg }">
						<view class="ring-hole">
							<text class="ring-pct">{{ ringPercent }}%</text>
							<text class="ring-label">年度完成度</text>
						</view>
					</view>
				</view>
			</view>
			<!-- 起止时间都可改：起始用 fields="month"（只到月），结束到日；均由 uni 官方 picker 呈现 -->
			<view class="overview-range">
				<picker mode="date" fields="month" :value="startMonthValue" :end="endDate" @change="onStartMonthChange">
					<text class="overview-range-text">{{ startMonthText }}</text>
				</picker>
				<text class="range-arrow">→</text>
				<picker mode="date" :value="endDate" :start="rangeMinDate" @change="onEndDateChange">
					<text class="overview-range-text">{{ endText }}</text>
				</picker>
				<uni-icons type="compose" size="14" color="var(--text-aux)" />
			</view>
			<text class="overview-quote">每一个小目标，都是未来的你在靠近</text>
		</view>

		<!-- ② 我的目标 -->
		<view class="section-head">
			<view class="section-left">
				<text class="section-title">我的目标</text>
				<text class="section-count" v-if="ready">共 {{ visibleGoals.length }} 个目标</text>
			</view>
			<view class="local-badge">
				<uni-icons type="phone" size="13" color="var(--text-aux)" />
				<text class="local-badge-text">本地保存</text>
			</view>
		</view>

		<!-- 首帧骨架：复用 .goal-card / .goal-main / .goal-info，尺寸与真卡片一致 -->
		<template v-if="!ready">
			<view class="goal-card glassmorphism" v-for="i in 3" :key="'goal-sk-' + i">
				<view class="goal-main">
					<skeleton-block w="76rpx" h="76rpx" circle />
					<view class="goal-info">
						<skeleton-block w="42%" h="30rpx" />
						<skeleton-block w="66%" h="24rpx" mt="18rpx" />
					</view>
				</view>
			</view>
		</template>

		<view
			class="goal-card glassmorphism"
			v-for="g in visibleGoals"
			:key="g.id"
			@click="goDetail(g)"
		>
			<view class="goal-main">
				<view class="goal-icon" :style="{ background: g.color + '26' }">
					<uni-icons :type="g.icon" size="26" :color="g.color" />
				</view>
				<view class="goal-info">
					<view class="goal-name-row">
						<text class="goal-name">{{ g.title }}</text>
						<text class="goal-tag" :style="{ color: g.color, background: g.color + '22' }">{{ g.tag }}</text>
					</view>
					<text class="goal-desc">{{ g.desc }}</text>
				</view>
				<view class="goal-del" @click.stop="askDelete(g)">
					<uni-icons type="trash" size="18" color="var(--text-weak)" />
				</view>
				<uni-icons type="right" size="14" color="var(--text-weak)" />
			</view>
			<view class="goal-progress-row">
				<text class="goal-percent">{{ percentOf(g) }}%</text>
				<view class="goal-bar-track">
					<view class="goal-bar-fill" :style="{ width: (barsIn ? percentOf(g) : 0) + '%', background: g.color }"></view>
				</view>
			</view>
			<view class="goal-milestone">
				<uni-icons type="flag-filled" size="12" :color="g.color" />
				<text class="milestone-text">已打卡 {{ g.checkins.length }} 天 · 进度 {{ fmtProgress(g.current) }} / {{ g.total }}{{ g.unit ? ' ' + g.unit : '' }}</text>
			</view>
		</view>

		<!-- ③ 新建目标 -->
		<view class="create-goal" @click="onCreate">
			<view class="create-goal-icon">
				<uni-icons type="plus" size="18" color="var(--on-brand)" />
			</view>
			<text class="create-goal-text">新建目标</text>
			<view class="create-goal-space"></view>
			<uni-icons type="right" size="14" color="var(--brand)" />
		</view>
		<view class="local-tip">
			<uni-icons type="phone" size="12" color="var(--text-weak)" />
			<text class="local-tip-text">本地保存 · 仅在本机设备中保存</text>
			<uni-icons type="checkmarkempty" size="12" color="var(--text-weak)" />
		</view>

		<!-- 新建目标弹层 -->
		<goal-create-sheet
			:visible="createVisible"
			@close="createVisible = false"
			@confirm="onGoalCreate"
		/>

		<!-- 底部导航（2030 为中间主入口） -->
		<app-tab-bar :current="1" />
	</view>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme, hideNativeTabBar } from '@/utils/app-mode.js'
import { nowTs, subscribeClock, unsubscribeClock } from '@/utils/ticker.js'

// 本页数据全部本地存储；首次进入用默认目标播种，之后以本机数据为准
const STORAGE_KEY = 'goals2030'

const DEFAULT_GOALS = [
	{
		id: 'growth', title: '个人成长', tag: '学习成长', icon: 'hand-up', color: '#3A83F7',
		desc: '读完 50 本书，提升认知与思维能力', current: 0, total: 50, type: 'amount', unit: '本', status: 'active',
		milestones: [
			{ name: '完成 5 本书', desc: '建立阅读习惯，开启新视野', target: 5, done: 5, date: '2026.10.12' },
			{ name: '完成 10 本书', desc: '构建更完整的知识体系', target: 10, done: 10, date: '2027.03.18' },
			{ name: '完成 20 本书', desc: '提升思考能力与认知水平', target: 20, done: 20, date: '2027.11.26' },
			{ name: '完成 30 本书', desc: '形成自己的知识框架', target: 30, done: 20, date: '2028.08.10' },
			{ name: '完成 50 本书', desc: '成为更好的自己', target: 50, done: 20, date: '2030.12.31' }
		],
		records: [
			{ date: '2026.10.12', text: '完成第 5 本书《认知觉醒》', tag: '里程碑' },
			{ date: '2027.03.18', text: '完成第 10 本书《人类简史》', tag: '里程碑' },
			{ date: '2027.11.26', text: '完成第 20 本书《思考，快与慢》', tag: '里程碑' }
		]
	},
	{
		id: 'wealth', title: '财富积累', tag: '财务规划', icon: 'wallet', color: '#F0B23E',
		desc: '实现资产增长，建立多元化收入', current: 0, total: 20, type: 'amount', unit: '笔', status: 'active',
		milestones: [
			{ name: '储蓄达到 1 万', desc: '迈出第一笔积累', target: 5, done: 5, date: '2026.11.20' },
			{ name: '第二收入来源跑通', desc: '副业变现尝试', target: 8, done: 2, date: '2027.06.30' },
			{ name: '被动收入覆盖日常开支', desc: '让钱开始替你工作', target: 7, done: 0, date: '2029.12.31' }
		],
		records: []
	},
	{
		id: 'body', title: '身体状态', tag: '健康生活', icon: 'heart-filled', color: '#27C68A',
		desc: '保持运动习惯，体脂率降至 15%', current: 0, total: 20, type: 'days', unit: '天', status: 'active',
		milestones: [
			{ name: '体脂降至 20%', desc: '戒掉宵夜，每周三练', target: 8, done: 8, date: '2026.12.15' },
			{ name: '体脂降至 18%', desc: '力量训练加量', target: 6, done: 4, date: '2027.09.01' },
			{ name: '体脂降至 15%', desc: '最终目标体态', target: 6, done: 0, date: '2029.06.30' }
		],
		records: []
	},
	{
		id: 'works', title: '作品计划', tag: '创作输出', icon: 'compose', color: '#8B5CF6',
		desc: '完成 1 个个人作品，发布到平台', current: 0, total: 20, type: 'amount', unit: '项', status: 'active',
		milestones: [
			{ name: '完成选题与策划案', desc: '想清楚再做', target: 3, done: 3, date: '2026.11.30' },
			{ name: '完成内容制作', desc: '一版一版打磨', target: 12, done: 0, date: '2028.12.31' },
			{ name: '发布上线', desc: '让作品被看见', target: 5, done: 0, date: '2030.06.30' }
		],
		records: []
	}
]

/** 旧格式（name/desc/done/total/percent）迁移到统一字段。
 * 进度按类型推导（均封顶总目标）：
 * days（按天坚持）= 打卡天数；amount（按量累计）= amounts 完成量累加 */
function normalizeGoal(raw) {
	if (!raw || typeof raw !== 'object') return null
	const total = Number(raw.total != null ? raw.total : (raw.targetValue != null ? raw.targetValue : 10)) || 10
	const checkins = Array.isArray(raw.checkins) ? raw.checkins : []
	const amounts = Array.isArray(raw.amounts) ? raw.amounts : []
	const type = raw.type === 'amount' ? 'amount' : 'days'
	const sum = amounts.reduce((s, a) => s + (Number(a && a.value) || 0), 0)
	return {
		id: raw.id || `g${Date.now()}${Math.floor(Math.random() * 1000)}`,
		title: raw.title || raw.name || '未命名目标',
		tag: raw.tag || '我的目标',
		icon: raw.icon || 'star-filled',
		color: raw.color || '#3A83F7',
		desc: raw.desc || raw.description || '持续推进中',
		current: type === 'amount' ? Math.min(total, Math.round(sum * 10) / 10) : Math.min(total, checkins.length),
		total,
		type,
		amounts,
		unit: raw.unit || '',
		milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
		records: Array.isArray(raw.records) ? raw.records : [],
		checkins,
		status: raw.status || 'active'
	}
}

// 本页没有模式切换入口，主题跟随全局内容模式（与其他页一致）
const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const goals = ref([])
// 本地数据在 onShow 里读，首帧是空的：用这个标记驱动列表骨架，避免闪一下空列表
const ready = ref(false)
const startMonthText = ref('2026.08')
const endDate = ref('2030-12-31')
const createVisible = ref(false)

/** 官方 picker 的可选下限：起始月份 1 号（选到起始日之前倒计时会变成 0） */
const rangeMinDate = computed(() => `${(startMonthText.value || '2026.08').replace('.', '-')}-01`)

/** fields="month" 的 picker 要 'YYYY-MM'，页面里显示用 'YYYY.MM' */
const startMonthValue = computed(() => (startMonthText.value || '2026.08').replace('.', '-'))

function onStartMonthChange(e) {
	const v = (e && e.detail && e.detail.value) || ''
	if (!/^\d{4}-\d{2}$/.test(v)) return
	if (v >= endDate.value.slice(0, 7)) {
		uni.showToast({ title: '起始月份要早于结束日期', icon: 'none' })
		return
	}
	startMonthText.value = v.replace('-', '.')
	persist()
	uni.showToast({ title: `起始时间已设为 ${startMonthText.value}`, icon: 'none' })
}

function loadGoals() {
	let saved = null
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (raw && typeof raw === 'object') saved = raw
	} catch (e) { /* 读不到按首次进入处理 */ }

	if (saved && Array.isArray(saved.goals)) {
		goals.value = saved.goals.map((raw) => {
			const g = normalizeGoal(raw)
			// 旧数据没有里程碑/记录：按 id 补齐默认目标的里程碑与单位（一次性迁移）
			const def = DEFAULT_GOALS.find((d) => d.id === g.id)
			if (def) {
				if (!g.milestones.length) g.milestones = def.milestones
				if (!g.records.length) g.records = def.records
				if (!g.unit) g.unit = def.unit
			}
			return g
		}).filter(Boolean)
		startMonthText.value = saved.startMonth || '2026.08'
		endDate.value = saved.endDate || '2030-12-31'
		persist() // 把迁移结果落盘，详情页读到的就是新格式
		return
	}
	// 走到这里说明 goals 字段整个丢了或不是数组（首次进入/数据损坏）才回种默认值；
	// 空数组是「用户把目标删完了」，上面那个分支会照常加载，不能在这里复活。
	// 但用户自定义的时间范围必须保留
	if (saved) {
		startMonthText.value = saved.startMonth || '2026.08'
		endDate.value = saved.endDate || '2030-12-31'
	}
	goals.value = DEFAULT_GOALS.map((g) => ({ ...g }))
	persist()
}

function persist() {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			startMonth: startMonthText.value,
			endDate: endDate.value,
			goals: goals.value
		})
	} catch (e) { /* 存储失败不阻塞 */ }
}

/** 归档目标不在列表展示，但仍保留在本地 */
const visibleGoals = computed(() => goals.value.filter((g) => g.status !== 'archived'))

function percentOf(g) {
	if (!g.total) return 0
	return Math.max(0, Math.min(100, Math.round((g.current / g.total) * 100)))
}

/** 进度展示：保留 1 位小数、去掉多余的 0（step<1 时 current 是小数） */
function fmtProgress(n) {
	return String(Math.round(n * 10) / 10)
}

/** 目标截止时间（当天 23:59:59）——随自定义日期变化 */
const endTs = computed(() => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate.value || '')
	if (!m) return new Date(2030, 11, 31, 23, 59, 59).getTime()
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59).getTime()
})

const endYear = computed(() => (endDate.value || '2030-12-31').slice(0, 4))

const endText = computed(() => (endDate.value || '2030-12-31').slice(0, 7).replace('-', '.'))

/** 距离目标日期的剩余天数——实时计算，跨天自动减 1 */

const realDaysLeft = computed(() => Math.max(0, Math.ceil((endTs.value - nowTs.value) / 86400000)))

/** 展示值：进场时从 0 滚动到真实值（动效），之后由 watcher 跟随跨天变化 */
const displayDays = ref(0)

const daysLeftText = computed(() => String(Math.round(displayDays.value)).replace(/\B(?=(\d{3})+(?!\d))/g, ','))

// 进场时目标卡进度条延迟一拍从 0 展开；秒级时钟本身在 utils/ticker.js，按订阅数启停
let barsTimer = null

onUnmounted(() => {
	if (barsTimer) clearTimeout(barsTimer)
	cancelAnimationFrame(percentRaf.value)
	cancelAnimationFrame(daysRaf.value)
})

/** 官方 date picker 回传 YYYY-MM-DD：全页倒计时/圆环/范围行随之更新 */
function onEndDateChange(e) {
	const v = (e && e.detail && e.detail.value) || ''
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return
	/* H5 端 picker 不强制 start（实测 1876 年仍可选），早于起始月份就挡掉 */
	if (v < rangeMinDate.value) {
		uni.showToast({ title: `目标日期不能早于 ${startMonthText.value}`, icon: 'none' })
		return
	}
	endDate.value = v
	persist()
	uni.showToast({ title: `目标日期已设为 ${v.slice(0, 7).replace('-', '.')}，倒计时已更新`, icon: 'none' })
}

/** 总体完成度 = 各目标完成度的平均值 */
const overallPercent = computed(() => {
	if (!visibleGoals.value.length) return 0
	const sum = visibleGoals.value.reduce((acc, g) => acc + percentOf(g), 0)
	return Math.round(sum / visibleGoals.value.length)
})

/** 圆环：conic-gradient，强调色随主题（浅蓝/黑金）自动翻转；进度值走补间动效 */
const displayPercent = ref(0)

const ringPercent = computed(() => Math.round(displayPercent.value))

const ringBg = computed(() => {
	const p = Math.max(0, Math.min(100, displayPercent.value))
	return `conic-gradient(var(--brand) 0% ${p}%, rgba(137, 148, 169, 0.22) ${p}% 100%)`
})

/* ==================== 进场动效：圆环/天数滚动 ==================== */

const percentRaf = ref(null)
const daysRaf = ref(null)
const barsIn = ref(false)

/** easeOutCubic 补间：从 from 滚到 to；同一槽位发起的新补间会打断旧的 */
function tweenTo(setter, from, to, duration, rafSlot) {
	cancelAnimationFrame(rafSlot.value)
	if (from === to) {
		setter(to)
		return
	}
	const startAt = Date.now()
	const step = () => {
		const p = Math.min(1, (Date.now() - startAt) / duration)
		const eased = 1 - Math.pow(1 - p, 3)
		setter(from + (to - from) * eased)
		if (p < 1) rafSlot.value = requestAnimationFrame(step)
	}
	rafSlot.value = requestAnimationFrame(step)
}

function playEnterAnimations() {
	tweenTo((v) => { displayPercent.value = v }, displayPercent.value, overallPercent.value, 900, percentRaf)
	tweenTo((v) => { displayDays.value = v }, displayDays.value, realDaysLeft.value, 900, daysRaf)
}

// 停留页面期间数据变化（新建目标 / 跨天）也走滚动，而不是跳变
watch(overallPercent, (val) => {
	tweenTo((v) => { displayPercent.value = v }, displayPercent.value, val, 700, percentRaf)
})

watch(realDaysLeft, (val) => {
	tweenTo((v) => { displayDays.value = v }, displayDays.value, val, 700, daysRaf)
})

function onCreate() {
	createVisible.value = true
}

/** 新建目标：入库并展示（进度从 0 开始，随每日打卡按类型增长） */
function onGoalCreate(payload) {
	goals.value.push(normalizeGoal({
		id: `g${Date.now()}`,
		title: payload.name,
		tag: payload.tag,
		icon: payload.icon,
		color: payload.color,
		desc: payload.desc,
		total: payload.total,
		type: payload.type,
		unit: payload.unit,
		current: 0,
		status: 'active'
	}))
	persist()
	createVisible.value = false
	uni.showToast({ title: '目标已创建', icon: 'success' })
}

function goDetail(g) {
	uni.navigateTo({ url: `/pages/goal-detail/index?id=${encodeURIComponent(g.id)}` })
}

/** 列表页直接删：确认文案与目标详情页的删除保持一致 */
function askDelete(g) {
	uni.showModal({
		title: '删除目标',
		content: '删除后该目标及其记录无法恢复，确定删除吗？',
		confirmText: '删除',
		confirmColor: '#FF5F6D',
		success: (res) => {
			if (!res.confirm) return
			goals.value = goals.value.filter((x) => x.id !== g.id)
			persist()
			uni.showToast({ title: '已删除', icon: 'none' })
		}
	})
}

onShow(() => {
	hideNativeTabBar()
	themeMode.value = getAppMode()
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	loadGoals()
	ready.value = true
	subscribeClock()
	if (barsTimer) clearTimeout(barsTimer)
	barsIn.value = false
	barsTimer = setTimeout(() => {
		barsIn.value = true
	}, 150)
	playEnterAnimations()
})

onHide(() => {
	unsubscribeClock()
	if (barsTimer) {
		clearTimeout(barsTimer)
		barsTimer = null
	}
})
</script>

<style scoped>
	/* ===== 2030 进度总览卡（整页唯一强视觉大卡） ===== */
	.overview-card {
		background: var(--overview-bg);
		border: 1rpx solid var(--overview-border);
		border-radius: var(--radius-xl);
		padding: 36rpx 32rpx;
		margin-bottom: 32rpx;
	}

	.overview-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.overview-label {
		font-size: 24rpx;
		color: var(--text-secondary);
	}

	.overview-days {
		display: flex;
		align-items: baseline;
		margin-top: 12rpx;
	}

	.days-num {
		font-size: 76rpx;
		font-weight: 700;
		color: var(--brand);
		letter-spacing: 1rpx;
	}

	.days-unit {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-left: 10rpx;
	}

	.days-tick {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 18rpx;
		letter-spacing: 1rpx;
	}

	.ring-wrap {
		flex-shrink: 0;
	}

	.ring {
		width: 168rpx;
		height: 168rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: ring-breathe 3.2s ease-in-out infinite;
	}

	@keyframes ring-breathe {
		0%, 100% { box-shadow: 0 0 0 0 var(--brand-glow-soft); }
		50% { box-shadow: 0 0 0 14rpx var(--brand-glow-soft); }
	}

	@media (prefers-reduced-motion: reduce) {
		.ring {
			animation: none;
		}
	}

	.ring-hole {
		width: 132rpx;
		height: 132rpx;
		border-radius: 50%;
		background: var(--overview-hole);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.ring-pct {
		font-size: 38rpx;
		font-weight: 700;
		color: var(--text);
		line-height: 1.1;
	}

	.ring-label {
		font-size: 18rpx;
		color: var(--text-aux);
		margin-top: 4rpx;
	}

	.overview-range {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 24rpx;
	}

	.overview-range-text {
		font-size: 26rpx;
		font-weight: 600;
		color: var(--text-secondary);
		margin-right: 12rpx;
	}

	.range-arrow {
		font-size: 26rpx;
		color: var(--text-aux);
		margin-right: 12rpx;
	}

	.overview-quote {
		display: block;
		font-size: 22rpx;
		color: var(--text-aux);
		margin-top: 10rpx;
	}

	/* ===== 我的目标标题行 ===== */
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4rpx 8rpx 24rpx;
	}

	.section-left {
		display: flex;
		flex-direction: column;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
		letter-spacing: 1rpx;
	}

	.section-count {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-top: 6rpx;
	}

	.local-badge {
		display: flex;
		align-items: center;
	}

	.local-badge-text {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 6rpx;
	}

	/* ===== 目标卡 ===== */
	.goal-card {
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.goal-main {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
	}

	/* 删除按钮：尺寸与图标取「干正事」卡片上 .timer-del 的同一组值 */
	.goal-del {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 4rpx;
		flex-shrink: 0;
	}

	.goal-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.goal-info {
		flex: 1;
		margin-left: 20rpx;
		margin-right: 16rpx;
		min-width: 0;
	}

	.goal-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.goal-name {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.goal-tag {
		font-size: 20rpx;
		line-height: 1;
		padding: 6rpx 14rpx;
		border-radius: 999rpx;
		margin-left: 14rpx;
		flex-shrink: 0;
	}

	.goal-desc {
		display: block;
		font-size: 24rpx;
		color: var(--text-aux);
		margin-top: 8rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.goal-progress-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 22rpx;
	}

	.goal-percent {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
		width: 100rpx;
		flex-shrink: 0;
	}

	.goal-bar-track {
		flex: 1;
		height: 14rpx;
		border-radius: 999rpx;
		background: rgba(137, 148, 169, 0.2);
		overflow: hidden;
	}

	.goal-bar-fill {
		height: 100%;
		border-radius: 999rpx;
		transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.goal-milestone {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 16rpx;
	}

	.milestone-text {
		font-size: 22rpx;
		color: var(--text-aux);
		margin-left: 8rpx;
	}

	/* ===== 新建目标按钮 ===== */
	.create-goal {
		display: flex;
		flex-direction: row;
		align-items: center;
		background: var(--brand-light);
		border-radius: var(--radius-md);
		padding: 22rpx 28rpx;
		margin-bottom: 16rpx;
	}

	.create-goal-icon {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: var(--brand);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.create-goal-text {
		font-size: 28rpx;
		font-weight: 600;
		color: var(--brand);
		margin-left: 20rpx;
	}

	.create-goal-space {
		flex: 1;
	}

	/* ===== 本地保存提示 ===== */
	.local-tip {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		padding: 4rpx 0 8rpx;
	}

	.local-tip-text {
		font-size: 22rpx;
		color: var(--text-weak);
		margin: 0 10rpx;
	}
</style>
