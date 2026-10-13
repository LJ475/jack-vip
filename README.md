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

## 设备尺寸适配（`utils/device-adapt.js` + App.vue 末尾的设备适配段）

**rpx 基准封顶**：rpx 是「按屏宽等比放大」的（uni 把它编译成 rem，运行时给 html 写
`font-size = 屏宽 / 23.4375`），于是平板 / 折叠屏展开 / 桌面 H5 上会胀到失真——768px 宽时
正文 28rpx 变成 28.7px（手机上是 14px）。App.vue 里用 `!important` 盖掉运行时写的内联值，
在 **560px 设计宽**处封顶：`font-size: min(4.26667vw, 23.8933px)`
（4.26667vw = 100 / 23.4375，所以 ≤560px 的窄屏数值与原来**一模一样**，手机端零变化）。

**内容列封顶居中**：同一个 560px，`.page` 收进 `--adapt-content-max` 并居中；悬浮 TabBar、
四个底部弹层、灯箱顶栏、登录页玻璃面板在宽屏下都跟着收窄居中。

**断点**（`utils/device-adapt.js` 的 `ADAPT` 常量与 App.vue 的媒体查询一一对应，改一处要一起改）：

| 档位 | 条件 | 处理 |
| --- | --- | --- |
| 窄屏 | 宽 < 360px | 页面左右留白 24rpx → 20rpx；Hero / 分段控件 / 登录问候收一档 |
| 标准 | 360–560px | 设计基准，不动 |
| 宽屏 | 宽 > 560px | rpx 封顶 + 内容列居中（平板、折叠屏展开、桌面 H5） |
| 矮屏 | 高 ≤ 640px | 纵向留白收一档、内容图 400rpx → 300rpx、登录页吉祥物收掉 |
| 横屏 | 宽 > 高 | 页面左右留白吃 `env(safe-area-inset-left/right)`（刘海在侧面） |
| H5 | — | `--vh` 真实可视高度（修地址栏收放时 100vh 偏大）；系统弹层宽屏收窄居中 |

CSS 媒体查询是主力（App 的页面跑在 webview 里，媒体查询同样准，且转屏即时生效、不闪屏）；
`utils/device-adapt.js` 只补 CSS 拿不到的三件事：`--vh`/`--vw` 与档位类（H5 挂到 html）、
`getDeviceProfile()` 尺寸画像、`rpx2px()` 按封顶后的基准做 rpx→px（**别再写死 0.5**，
那是 375px 设计宽的假设）。`ip-mascot` 的重力球用它算碰撞半径，否则宽屏上球会压出场边。

## 其他约定

- UI 严格按《手机端  UI开发文档.md》（文件名含两个空格）：毛玻璃全部由 `.glassmorphism` 提供，局部只允许改 `--glass-*` 变量；品牌色 #3A83F7；图标只用 uni-icons。
- 打包与真机测试由用户在 HBuilderX 手动完成。
