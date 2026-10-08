/**
 * 保存图片到相册（App 端，自带 loading 与 toast，调用方无需处理回调）
 *
 * - 网络图：先 downloadFile 到临时文件再保存
 * - 包内 static 图：部分安卓机型读不到 _www 路径，保存失败时先复制到 _doc 再试
 *
 * @param {string} path 图片地址（http/https 或本地路径）
 * @returns {Promise<void>} 成功 resolve；失败 reject（提示已内部给出）
 */
export function saveImageToAlbum(path) {
	if (!path) return Promise.reject(new Error('empty path'))

	if (/^https?:\/\//i.test(path)) {
		uni.showLoading({ title: '保存中…', mask: true })
		return new Promise((resolve, reject) => {
			uni.downloadFile({
				url: path,
				success: (res) => {
					uni.hideLoading()
					if (res.statusCode === 200) {
						doSave(res.tempFilePath).then(resolve).catch(reject)
					} else {
						uni.showToast({ title: '保存失败，请重试', icon: 'none' })
						reject(new Error(`下载失败（${res.statusCode}）`))
					}
				},
				fail: (err) => {
					uni.hideLoading()
					uni.showToast({ title: '保存失败，请重试', icon: 'none' })
					reject(err)
				}
			})
		})
	}

	return doSave(path)
}

function doSave(filePath) {
	return new Promise((resolve, reject) => {
		uni.saveImageToPhotosAlbum({
			filePath,
			success: () => {
				uni.showToast({ title: '已保存到相册', icon: 'success' })
				resolve()
			},
			fail: (err) => {
				const msg = (err && err.errMsg) || ''
				if (/auth|deny|denied/i.test(msg)) {
					uni.showModal({
						title: '需要相册权限',
						content: '保存图片需要相册权限，请在手机设置中允许本应用访问照片后重试',
						showCancel: false
					})
					reject(err)
					return
				}
				// #ifdef APP-PLUS
				copyThenSave(filePath).then(resolve).catch(reject)
				// #endif
				// #ifndef APP-PLUS
				uni.showToast({ title: '保存失败，请重试', icon: 'none' })
				reject(err)
				// #endif
			}
		})
	})
}

// 部分安卓机型读不到包内 static 路径：先复制到 _doc 再保存（仅本地静态图需要）
function copyThenSave(filePath) {
	return new Promise((resolve, reject) => {
		const name = filePath.split('/').pop() || `img-${Date.now()}.jpg`
		plus.io.resolveLocalFileSystemURL('_www' + filePath, (entry) => {
			plus.io.resolveLocalFileSystemURL('_doc/', (dir) => {
				entry.copyTo(dir, name, (copied) => {
					uni.saveImageToPhotosAlbum({
						filePath: copied.fullPath,
						success: () => {
							uni.showToast({ title: '已保存到相册', icon: 'success' })
							resolve()
						},
						fail: (err) => {
							uni.showToast({ title: '保存失败，请重试', icon: 'none' })
							reject(err)
						}
					})
				}, (err) => {
					uni.showToast({ title: '保存失败，请重试', icon: 'none' })
					reject(err)
				})
			}, (err) => {
				uni.showToast({ title: '保存失败，请重试', icon: 'none' })
				reject(err)
			})
		}, (err) => {
			uni.showToast({ title: '保存失败，请重试', icon: 'none' })
			reject(err)
		})
	})
}
