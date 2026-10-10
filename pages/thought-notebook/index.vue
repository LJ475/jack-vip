<template>
	<view class="page notebook" :class="{ 'theme-thought': isThoughtTheme }">
		<!-- 顶栏：返回 / 日期 / 保存 -->
		<view class="nb-head">
			<view class="nb-back" @click="close">
				<uni-icons type="left" size="20" color="var(--text-secondary)" />
			</view>
			<view class="nb-date-wrap">
				<text class="nb-date">{{ dateText }}</text>
				<text class="nb-week">{{ weekText }}</text>
			</view>
			<view class="nb-save" :class="{ 'nb-save-dim': !dirty }" @click="close">
				<text class="nb-save-text">保存</text>
			</view>
		</view>

		<!-- 横线纸：textarea 压在行线上，行高等于线间距，字就坐在格子线上 -->
		<view class="nb-paper">
			<textarea
				class="nb-input"
				v-model="draft"
				:maxlength="NOTE_MAX_LEN"
				placeholder="写下今天的想法……"
				placeholder-class="nb-ph"
				:focus="true"
				:show-confirm-bar="false"
				:cursor-spacing="24"
			/>
		</view>

		<view class="nb-foot">
			<text class="nb-count">{{ draft.length }}/{{ NOTE_MAX_LEN }}</text>
			<text class="nb-hint">本机保存 · 仅存在这台设备</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { NOTE_MAX_LEN, getNote, saveNote } from '@/utils/thought-notes.js'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'

const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const date = ref('')
const draft = ref('')
// 进入时那份原文，用来判断有没有改动（没改动就不写存储、也不刷新「记录于」时间）
const original = ref('')

const themeMode = ref(getAppMode())
const isThoughtTheme = computed(() => themeMode.value === CONTENT_MODE.THOUGHT)

const dirty = computed(() => (draft.value || '').trim() !== (original.value || '').trim())

const dateText = computed(() => (date.value || '').replace(/-/g, '.'))

const weekText = computed(() => {
	if (!date.value) return ''
	const d = new Date(date.value.replace(/-/g, '/'))
	return isNaN(d.getTime()) ? '' : WEEKS[d.getDay()]
})

onLoad((query) => {
	date.value = (query && query.date) || ''
	const rec = getNote(date.value)
	original.value = (rec && rec.text) || ''
	draft.value = original.value
	// 奶酪体只在这一页按需加载：不写进全局 CSS，首页与切页不为它买单。
	// 也不能写在样式里用 url()——vite 编译期会去解析这个文件，字体没到位时整个包都编不过。
	uni.loadFontFace({
		family: 'NailaoHand',
		src: 'url("/static/fonts/nailao.ttf")',
		global: true,
		fail: () => {
			// 字体文件还没放进来时用系统字体，不阻塞写东西
		}
	})
	// 这个页面是新开的 webview，底色跟着主题先刷一遍，否则暗色下进本页会闪一下浅蓝
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
})

/** 落盘：内容为空时按「没记录」处理（utils/thought-notes.js 里会删掉那条） */
function commit() {
	if (!dirty.value) return
	const saved = saveNote(date.value, draft.value)
	original.value = saved.text
}

function close() {
	commit()
	uni.navigateBack()
}

// 系统返回键/侧滑退出时兜底保存，避免写完直接退丢内容
onUnload(() => {
	commit()
})
</script>

<style scoped>
	.notebook {
		display: flex;
		flex-direction: column;
		height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 12rpx) 28rpx calc(env(safe-area-inset-bottom) + 16rpx);
		/* 亮色：米白纸张 + 浅灰行线 */
		--nb-paper: #FFFDF6;
		--nb-line: rgba(23, 33, 58, 0.13);
		--nb-ink: #333333;
		--nb-ink-soft: #8994A9;
		background: linear-gradient(135deg, #edf4ff, #f8fbff);
	}

	.notebook.theme-thought {
		/* 暗色：墨黑纸张 + 弱金行线 */
		--nb-paper: #101014;
		--nb-line: rgba(232, 179, 65, 0.13);
		--nb-ink: #E8E8EA;
		--nb-ink-soft: #85858D;
	}

	.nb-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding-bottom: 16rpx;
	}

	.nb-back {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nb-date-wrap {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: baseline;
		justify-content: center;
	}

	.nb-date {
		font-size: 32rpx;
		font-weight: 600;
		color: var(--text);
	}

	.nb-week {
		font-size: 24rpx;
		color: var(--text-aux);
		margin-left: 12rpx;
	}

	.nb-save {
		height: 60rpx;
		padding: 0 26rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999rpx;
		background: var(--brand);
	}

	.nb-save-dim {
		opacity: 0.45;
	}

	.nb-save-text {
		font-size: 26rpx;
		font-weight: 600;
		color: var(--on-brand);
	}

	.nb-paper {
		flex: 1;
		position: relative;
		border-radius: 28rpx;
		background: var(--nb-paper);
		border: 1rpx solid var(--nb-line);
		overflow: hidden;
	}

	/* 一行一条线：线画在每个 88rpx 行的底部，line-height 与它相等，字就落在线上 */
	.nb-input {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: 10rpx 26rpx 0;
		background-color: transparent;
		background-image: repeating-linear-gradient(
			180deg,
			transparent 0,
			transparent 87rpx,
			var(--nb-line) 87rpx,
			var(--nb-line) 88rpx
		);
		background-size: 100% 88rpx;
		line-height: 88rpx;
		font-size: 34rpx;
		color: var(--nb-ink);
		font-family: 'NailaoHand', 'PingFang SC', 'Microsoft YaHei', sans-serif;
	}

	.nb-ph {
		color: var(--nb-ink-soft);
	}

	.nb-foot {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding-top: 16rpx;
	}

	.nb-count {
		font-size: 24rpx;
		color: var(--text-aux);
	}

	.nb-hint {
		font-size: 22rpx;
		color: var(--text-weak);
	}
</style>
