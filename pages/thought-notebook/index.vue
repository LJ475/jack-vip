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

		<!-- 横线纸：行线画在纸上，输入框透明且随内容长高，整页跟着滚（光标永远在可见区域里） -->
		<view class="nb-paper">
			<textarea
				class="nb-input"
				v-model="draft"
				:maxlength="NOTE_MAX_LEN"
				placeholder="写下今天的想法……"
				placeholder-class="nb-ph"
				:show-confirm-bar="false"
				:cursor-spacing="24"
				auto-height
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
import { NOTE_MAX_LEN, getNoteById, addNote, updateNote } from '@/utils/thought-notes.js'
import { CONTENT_MODE } from '@/api/shares.js'
import { getAppMode, syncStatusBarTheme, syncRootTheme } from '@/utils/app-mode.js'

const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const date = ref('')
// 有 id = 在改那一天里已有的某一篇；空 = 新写一篇（同一天可以写多篇）
const noteId = ref('')
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
	noteId.value = (query && query.id) || ''
	const rec = noteId.value ? getNoteById(date.value, noteId.value) : null
	if (!rec) noteId.value = ''
	original.value = (rec && rec.text) || ''
	draft.value = original.value
	// 这个页面是新开的 webview，底色跟着主题先刷一遍，否则暗色下进本页会闪一下浅蓝
	syncStatusBarTheme(themeMode.value)
	syncRootTheme(themeMode.value)
	// 奶酪体只在这一页按需加载：不写进全局 CSS，首页与切页不为它买单。
	// 也不能写在 <style> 的 @font-face url() 里——vite 编译期会去解析该文件，字体没到位时整个包编不过。
	// 参数名是 source（不是 src）：uni-h5 的实现里直接 source.startsWith()，传错会抛异常打断 onLoad。
	uni.loadFontFace({
		family: 'NailaoHand',
		source: 'url("/static/fonts/nailao.ttf")',
		global: true
	})
})

/** 落盘：改已有的就更新那一篇；新写的就追加一篇。
 *  内容清空 = 删掉那一篇（utils/thought-notes.js 里处理），保持「没记录」的语义。 */
function commit() {
	if (!dirty.value) return
	if (noteId.value) {
		const saved = updateNote(date.value, noteId.value, draft.value)
		original.value = saved.removed ? '' : saved.text
		if (saved.removed) noteId.value = ''
		return
	}
	if (!(draft.value || '').trim()) return
	const added = addNote(date.value, draft.value)
	if (added) {
		noteId.value = added.id
		original.value = added.text
	}
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
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 12rpx) 28rpx calc(env(safe-area-inset-bottom) + 16rpx);
		/* 亮色：米白纸张 + 浅灰行线 */
		--nb-page-bg: linear-gradient(135deg, #edf4ff, #f8fbff);
		--nb-paper: #FFFDF6;
		--nb-line: rgba(23, 33, 58, 0.22);
		--nb-ink: #333333;
		--nb-ink-soft: #8994A9;
		background: var(--nb-page-bg);
	}

	/* 注意：这条必须同时改写页面底色。App.vue 里暗色那条是 .theme-thought（一级类），
	   而这里的浅色底是 .notebook + scoped 属性（两级），不一起改的话暗色下纸是黑的、
	   纸外面还是浅蓝，顶部日期也会变成浅字亮底看不见。 */
	.notebook.theme-thought {
		/* 暗色：墨黑纸 + 弱金行线 */
		--nb-page-bg: linear-gradient(180deg, #0C0C11 0%, #0B0B0F 100%);
		--nb-paper: #101014;
		--nb-line: rgba(232, 179, 65, 0.3);
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
		border: 1rpx solid var(--nb-line);
		overflow: hidden;
		box-sizing: border-box;
		/* 行线画在纸上：一条线 2rpx 宽、行距 88rpx，从内容区顶部开始排，
		   和下面 textarea 的 line-height 对齐，字就坐在线上 */
		background-color: var(--nb-paper);
		padding: 12rpx 26rpx 24rpx;
		background-image: repeating-linear-gradient(
			180deg,
			transparent 0,
			transparent 86rpx,
			var(--nb-line) 86rpx,
			var(--nb-line) 88rpx
		);
		background-size: 100% 88rpx;
		background-origin: content-box;
		background-clip: padding-box;
	}

	.nb-input {
		width: 100%;
		min-height: 88rpx;
		padding: 0;
		background: transparent;
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
