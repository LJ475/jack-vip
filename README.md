# jack会员分享

uni-app + Vue 3（HBuilderX 工程，appid `__UNI__1B430BA`），目标平台 Android APK。

两个页面：
- **分享**（`pages/calendar/index.vue`）：专属会员分享 / 365天思考实验双模式日历，打点、当日内容、详情弹层、思考实验打卡（`thought-note-card`）
- **干正事**（`pages/work/index.vue`）：倒计时 + 系统级闹钟提醒

## 数据（三档数据源，`api/shares.js` 的 `DATA_SOURCE` 切换）

**'cos'（正式，当前生效）——COS 清单文件，无数据库无后端：**

- 清单地址带随机段（**地址即密钥**，挡住猜 URL 扒全量列表；换地址时 shares.js 两个常量
  与爬虫端 server.py 的 `MANIFEST_FILENAME` 一起改）：
  - 专属会员分享：`https://img.xiaonbai.top/douyin/manifest-ada49c70.json`
  - 思考实验：`https://img.xiaonbai.top/douyin/thought-manifest-78874e1c.json`
- 图片按 `{日期}_{作品ID前8位}_{序号}.jpg` 传桶（作品 ID 每天不同，App 无法从日期反推
  URL），所以清单文件键为日期、值为该日直链数组：
  ```json
  {
    "2026-10-03": ["https://img.xiaonbai.top/douyin/2026-10-03_76924039_1.jpg"],
    "2026-10-04": ["https://img.xiaonbai.top/douyin/2026-10-04_xxx_1.jpg",
                   "https://img.xiaonbai.top/douyin/2026-10-04_xxx_2.jpg"]
  }
  ```
- **清单由爬虫系统自动生成发布**（`D:\桌面\抖音主页爬取`）：界面「批量转存」跑完后执行
  `python publish_manifest.py --put`，自动从 history.json 的 hosted 字段生成并 PUT 到
  COS（只收 COS 直链、按 aweme_id 去重、空清单拒绝上传、上传后回读核验）；也提供
  `POST /api/publish-manifest` 接口（`{"dry_run": true}` 只预览）。手动模板：
  `cos上传用/manifest-ada49c70.json`。思考实验同理 `thought-manifest-78874e1c.json`
  （没传 = 该模式为空，不报错）。
- App 拉一次清单同时得到「打点日期」和「某天图片列表」；清单带 `?t=` 时间戳绕缓存，
  客户端内存缓存 10 分钟；清单 404（还没传）按「暂无内容」降级，其他错误页面显示重试。
- 桶/对象保持公有读；密钥只在本机 config/cos.json，不进 App、不进清单。

**'cloudbase'（备用）——腾讯云 CloudBase：**

- 网关 `{env}.api.tcloudbasegateway.com`，PostgREST 风格 REST；鉴权用客户端 Publishable Key。
- 表 `daily_shares`：id / share_date / image_url / caption / source_name / created_at / **mode**（`image` | `thought`）
- 表 `contributors`（感谢名单，**一直走这条路**，`api/contributors.js`）：id / name / avatar_url / qr_url
- **安全**：Publishable Key 会随 APK 分发，两张表务必只对 anon 角色开「读」权限，不要开写。

**'mock'（开发/演示）——本地模拟数据。**

- `utils/request.js` 对非 2xx 的 reject 带 `statusCode`（清单 404 降级依赖它）。

## 本地改动过的第三方组件（更新插件前必看）

`uni_modules/uni-calendar` 手工改过（npmmirror 拉 @dcloudio/uni-ui tgz 抽取安装）：

- `components/uni-calendar/uni-calendar-item.vue`：新增 `.uni-calendar-mark`，按 `selected[].info` 值透传打点类名——`i`=专属会员分享（蓝 #3A83F7）、`t`=思考实验（橙 #F59E0B）；模板约 53-56 行，样式约 148-156 行。
- 页面侧用 `:deep()` 隐藏了 info 文字位（`.uni-calendar-item--extra`），并把选中/今天样式改成圆角方块。

**从插件市场更新 uni-calendar 会覆盖这些改动，双色打点会静默丢失**，需按上述说明重新打补丁。

## 倒计时闹钟（api/countdown.js）

- 主通道：`AlarmManager.setAlarmClock` 拉起 App（免授权、杀进程生效）→ `pendingAlarms` 到期 → 全屏响铃（`/static/jack.mp3` 循环 + 循环震动），点「停止响铃」结束。
- 兜底：+30s 本地推送通知；主通道开始响铃即撤销，防双重提醒。多个任务同时到点会排队依次响铃。
- 锁屏亮屏 flag（`applyLockScreenFlags`）在 **App onShow 每次补设**——进程被杀后系统重建的 Activity 不保留之前设置的 flag。
- Android 13+ 通知权限运行时申请；ROM 后台限制靠「后台响铃保障」指引卡引导用户开自启动/电池白名单。

## 每日更新提醒（api/daily-reminder.js）

- `plus.push.createMessage` 的 delay 是一次性的，这里一次调度未来 7 天的本地通知，App 每次回前台自动检查覆盖并续期。
- 开关与提醒时间在「关于我」弹层（仅 App 端渲染）；默认每天 20:00。

## 保存图片（utils/save-image.js）

详情弹层「保存图片到相册」与关于我二维码保存共用：网络图先 downloadFile；本地图在部分安卓机型上先复制到 `_doc` 再存；含相册权限拒绝引导。

## 其他约定

- UI 严格按《手机端  UI开发文档.md》（文件名含两个空格）：毛玻璃全部由 `.glassmorphism` 提供，局部只允许改 `--glass-*` 变量；品牌色 #3A83F7；图标只用 uni-icons。
- 打包与真机测试由用户在 HBuilderX 手动完成。
