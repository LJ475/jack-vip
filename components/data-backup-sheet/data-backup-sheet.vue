<template>
	<view v-if="visible" class="bk-wrap">
		<view class="bk-mask" @click="close"></view>
		<view class="bk-sheet">
			<view class="bk-inner glassmorphism glass-sheet">
				<view class="bh-head">
					<text class="bh-title">备份与恢复</text>
					<view class="bh-close" @click="close">
						<uni-icons type="closeempty" size="20" color="var(--text-aux)" />
					</view>
				</view>
				<text class="bh-tip">数据只存在这台设备上（目标与打卡、思考本子、倒计时、日历选中日期）。换机或卸载前，先把这里导出去存好。</text>
				<view class="bh-actions">
					<button class="btn btn-primary full-btn" @click="doExport">导出到剪贴板</button>
					<button class="btn btn-ghost full-btn bh-gap" @click="doImport">从剪贴板恢复</button>
				</view>
				<text class="bh-note">不含系统闹钟设置（那些是本机系统的东西，不跟着数据走）。恢复会覆盖本机现有数据，会先问一次。</text>
			</view>
		</view>
	</view>
</template>

<script setup>
// 本机数据的导出 / 恢复。没有云同步，这份 JSON 就是他唯一的搬家手段。
const props = defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

// 参与备份的键（storage key → 备份里用的名字）
const KEYS = {
	goals2030: '目标与打卡',
	thoughtNotes: '思考本子',
	workTimers: '倒计时',
	lastSelectedDate: '日历选中日期'
}

function pad(n) {
	return String(n).padStart(2, '0')
}

function close() {
	emit('close')
}

function buildPayload() {
	const keys = {}
	Object.keys(KEYS).forEach((k) => {
		try {
			const v = uni.getStorageSync(k)
			if (v !== '' && v !== null && typeof v !== 'undefined') keys[k] = v
		} catch (e) { /* 读不到就跳过 */ }
	})
	const d = new Date()
	const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
	return { app: 'jack-vip', v: 1, exportedAt: stamp, keys }
}

function doExport() {
	const payload = buildPayload()
	const text = JSON.stringify(payload)
	uni.setClipboardData({
		data: text,
		success: () => {
			uni.showToast({ title: `已复制 ${Math.round(text.length / 1024)}KB`, icon: 'none' })
		},
		fail: () => {
			uni.showToast({ title: '复制失败，请重试', icon: 'none' })
		}
	})
}

function doImport() {
	uni.getClipboardData({
		success: (res) => {
			let parsed = null
			try {
				parsed = JSON.parse((res && res.data) || '')
			} catch (e) {
				uni.showToast({ title: '剪贴板里没有可用的备份', icon: 'none' })
				return
			}
			const keys = parsed && parsed.keys
			if (!keys || typeof keys !== 'object') {
				uni.showToast({ title: '剪贴板里没有可用的备份', icon: 'none' })
				return
			}
			const names = Object.keys(keys).filter((k) => KEYS[k]).map((k) => KEYS[k])
			uni.showModal({
				title: '确认恢复',
				content: `会覆盖本机现有数据：${names.join('、') || '（备份里没有可识别的数据）'}。恢复后建议退出重进一次。`,
				confirmText: '恢复',
				confirmColor: '#FF5F6D',
				success: (r) => {
					if (!r.confirm) return
					applyImport(keys)
				}
			})
		},
		fail: () => {
			uni.showToast({ title: '读剪贴板失败', icon: 'none' })
		}
	})
}

function applyImport(keys) {
	let n = 0
	Object.keys(KEYS).forEach((k) => {
		if (typeof keys[k] === 'undefined') return
		try {
			uni.setStorageSync(k, keys[k])
			n++
		} catch (e) { /* 单个失败不影响其它 */ }
	})
	close()
	uni.showToast({ title: n ? `已恢复 ${n} 项` : '备份是空的', icon: 'none' })
}
</script>

<style scoped>
	.bk-wrap {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 1200;
	}

	.bk-mask {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: var(--mask-bg);
	}

	.bk-sheet {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0 24rpx calc(env(safe-area-inset-bottom) + 24rpx);
	}

	.bk-inner {
		padding: 8rpx 28rpx 28rpx;
	}

	.bh-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0;
	}

	.bh-title {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--text);
	}

	.bh-close {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bh-tip {
		display: block;
		font-size: calc(24rpx * var(--fs, 1));
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.bh-actions {
		margin-top: 24rpx;
	}

	.bh-gap {
		margin-top: 16rpx;
	}

	.bh-note {
		display: block;
		font-size: calc(20rpx * var(--fs, 1));
		line-height: 1.6;
		color: var(--text-weak);
		margin-top: 18rpx;
	}
</style>
