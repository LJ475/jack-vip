# jack会员分享 · 宣传图 AI 生成需求文档

> **本文件的用途**：把这份文档整段丢给 AI 绘图工具（Midjourney / 即梦 / 可灵 / 文心一格 / DALL·E / Nano Banana 等），
> 让它按下面的功能说明与视觉规范产出宣传图。
> **注意**：文档已包含「画面描述」「文案」和「可直接复制的提示词」三部分。AI 对中文字形的还原普遍不稳，
> 建议 **让 AI 只出画面、文字留白，后期自己用 PPT / Figma / 醒图 叠加中文**（见第 7 节「交付与加字建议」）。

---

## 1. 产品概览

| 项目 | 内容 |
|---|---|
| 产品名称 | **jack会员分享** |
| 应用副标题（App 描述） | 每天一张值得收藏的分享图 |
| 产品形态 | 移动端 App（uni-app，Vue3；Android / iOS / 小程序均可打包） |
| 一句话定位 | 一个「每天更新精选图片分享 + 能设系统级闹钟的倒计时工具」的轻量 App |
| 品牌主理人 | Jack（应用内以卡通头像作为品牌 IP 与 Logo） |
| 核心价值 | ① 每天来收一张好图，日历上一眼看清哪天有更新；② 一键保存原图；③ 用「干正事」倒计时管住自己的时间 |
| 目标用户 | 喜欢收集图文灵感、日常碎片化浏览内容的人；需要番茄钟/专注倒计时的人 |
| 页面数量 | 2 个主页面 + 4 个底部弹层（Sheet） |
| 品牌色 | 亮蓝 `#3A83F7` |

### 一句话 slogan 备选（供图上使用）

- 主推：**每天一张，值得收藏**
- 副推：**看分享，也干正事**
- 情绪向：**把喜欢的内容，收进自己的日历里**
- 功能向：**系统级闹钟，杀进程也响**

---

## 2. 核心功能清单（按页面拆解）

### 页面一：分享（日历页）— 底部导航第 1 个 Tab

| 模块 | 功能说明 | 可作为宣传卖点 |
|---|---|---|
| 顶部 Hero 区 | 圆形卡通头像 Logo + 标题「jack会员分享」；右上角「关于我」胶囊入口 | 品牌识别 |
| 毛玻璃日历卡片 | 月历视图；**有分享的日期自动打点**；点击某天即切换当天内容；左右切换月份 | 「日历打点，哪天有更新一目了然」 |
| 当天分享列表 | 标题显示「2026年10月3日 · 今日分享」+「N 张图」标签；每张分享是一张卡片：**大图（约 16:9 裁切）+ 一句文案 + 来源标签 + 发布时间** | 「每天 N 张精选」 |
| 加载/失败/空状态 | 加载中转圈、失败可重试、空状态提示「这一天暂时还没有分享」 | — |
| 分享详情弹层 | 点卡片弹出底部 Sheet：**完整大图 + 文案 + 来源 + 日期时间**；点图可全屏预览，长按可保存到相册 | 「点开看大图」 |
| 关于我弹层 | 两个 Tab：**「关于我」**展示 Jack 的抖音二维码，附「保存到相册」按钮与关注指引；**「感谢」**展示贡献者头像横滑列表，选中后显示 TA 的抖音二维码，也可保存 | 「一键保存二维码去关注」 |
| 闹钟联动 | 若倒计时到点，进入 App 会自动跳转到「干正事」页响铃 | 系统级提醒 |

### 页面二：干正事（倒计时页）— 底部导航第 2 个 Tab

| 模块 | 功能说明 | 可作为宣传卖点 |
|---|---|---|
| 顶部 Hero 区 | 标题「干正事」+ 副标题「设置一个倒计时，然后去做**真正重要**的事情」 | 情绪价值 |
| 新建倒计时入口卡 | 毛玻璃卡片，`+` 图标 + 「新建倒计时 / 设置时间，然后开始行动」 | — |
| 我的倒计时列表 | 每条卡片显示：**任务名 + 大号剩余时间（HH:MM:SS，品牌蓝加粗）+ 状态文案（系统闹钟 · 未启动/已设/已完成）+ 操作按钮（开始 / 进行中 / 已完成 / 重新启动）+ 删除图标**；支持「一键清除」全部 | 「多个倒计时并行」 |
| 新建倒计时弹层 | **名称输入框**（占位文案「例如：专注学习 / 写代码 / 背单词」）+ **快捷时长胶囊**（5 / 10 / 15 / 25 / 45 分钟）+ **时/分/秒三列滚轮选择器** + 蓝色发光「开始倒计时」按钮 + 提示「到点由系统闹钟响铃/震动提醒，离开应用也会继续」 | 「25 分钟专注，一按即走」 |
| 运行中弹层 | 超大号剩余时间数字 + 「闹钟已设 · 进行中」+ 说明条 + 「停止 / 删除」按钮 | — |
| 完成弹层 | 绿色对勾 + 「时间到了」+ 任务名 + 关闭按钮 | — |
| 全屏响铃层 | 到点时全屏遮罩 + 毛玻璃卡片：铃铛图标 + 任务名 + 「时间到了」+ 蓝色「停止响铃」大按钮；**同时循环播放铃声 + 循环震动** | 「真·闹钟：杀进程也响、循环响铃 + 震动」 |
| 后台响铃保障卡 | 4 条指引（允许自启动与后台运行 / 电池策略不限制 / 最近任务锁定 / 允许通知权限）+「去开启」按钮直达系统设置 | 「认真做了后台保活，提醒不丢」 |

### 底部导航

悬浮 **毛玻璃胶囊 TabBar**，两个 Tab：`分享`（日历图标）、`干正事`（铃铛图标），选中态图标放大 1.1 倍并变品牌蓝。

---

## 3. 视觉规范（AI 出图必须遵守）

### 3.1 色彩

| 用途 | 色值 |
|---|---|
| 品牌主色（按钮 / 选中态 / 数字 / 强调） | `#3A83F7` |
| 主色浅底（标签底 / 图标底） | `rgba(58,131,247,0.12)` |
| 主色光晕（按钮辉光 / 阴影） | `rgba(58,131,247,0.25)` |
| 页面底色（浅蓝对角渐变） | `linear-gradient(135deg, #EDF4FF, #F8FBFF)` |
| 主文字 | `#333333` |
| 次级文字 | `#5C6C8D` |
| 辅助文字 | `#8994A9` |
| 弱化文字 | `#B3BDCC` |
| 成功 / 完成 | `#27C68A` |
| 警示 | `#F59E0B` |
| 危险 / 删除 | `#FF5F6D` |
| 毛玻璃底 | `rgba(255,255,255,0.58)` |
| 毛玻璃描边 | `rgba(255,255,255,0.65)` |

### 3.2 材质与形状

- **毛玻璃（核心视觉）**：白色半透明底 58% + 背景模糊 `blur(16px) saturate(160%)` + 1px 白色半透明描边 + 柔和投影 `0 8rpx 32rpx rgba(31,45,61,0.12)`。**这是整个 App 最重要的视觉记忆点**，宣传图里必须体现。
- **圆角**：大卡片 40–48rpx（≈20–24px）、普通卡片 28–32rpx、标签/输入框 20–24rpx、胶囊 999px。
- **光影**：浅色背景 + 大范围柔和阴影，整体通透、轻盈、明亮；不要暗色系、不要重投影。
- **层次**：页面底色（浅蓝渐变）→ 毛玻璃卡片 → 品牌蓝点缀，三层清晰。

### 3.3 字体与排版

- 字体：`PingFang SC` / `Microsoft YaHei` / 无衬线中文字体。
- 层级：大标题 40rpx 加粗、卡片标题 30rpx 半粗、正文 26–28rpx、辅助 22–24rpx。
- 倒计时数字：**超大号（72rpx）加粗品牌蓝**，是页面的视觉焦点。

### 3.4 品牌 IP

- Logo 是一个**戴黑框眼镜、黑色 T 恤、黑色短刺发型的卡通男孩头像**（半身、暖色皮肤、可爱写实 2D 插画风）。
- 宣传图中可将该卡通形象作为「主理人 IP」出现在角落或画面引导位。

---

## 4. 素材清单（供合成 / 参考）

| 素材 | 路径 | 说明 |
|---|---|---|
| 品牌 Logo / 卡通头像 | `static/logo.png` | 主 IP，圆形裁切使用 |
| 抖音二维码 | `static/douyin-qr.jpg` | 「关于我」用 |
| 铃声 | `static/jack.mp3` | 到点循环播放 |
| 分享图示例 | `static/mock/share-01.png` ~ `share-08.png` | 8 张模拟分享图，可作画面里的内容填充 |

---

## 5. 宣传图方案（三选一或全做）

### 方案 A ｜ 主视觉海报（竖版 · 手机展示型）

- **尺寸**：1080 × 1920（9:16，适配应用商店首图 / 开屏 / 朋友圈）
- **构图**：画面中央偏右一部手机，机身内显示「分享」日历页界面（毛玻璃日历 + 下方两张分享卡片）；
  手机左后方浮出一张半透明的毛玻璃分享大图卡片；左上角放品牌 Logo 与主标题留白区。
- **氛围**：浅蓝渐变背景，右上角一抹品牌蓝光晕，背景散布几个虚化的圆角小卡片（毛玻璃质感），营造层次。
- **画面内文案（留白区，后期叠加）**：
  - 主标题：`jack会员分享`
  - 副标题：`每天一张，值得收藏`
  - 角标：`日历打点 · 一键存图 · 系统闹钟`

**中文提示词（可直接复制）**

> 移动 App 宣传海报，竖版 9:16。画面中央一部现代智能手机，屏幕内是一个日历分享类 App 界面：浅蓝色渐变背景，上方白色毛玻璃圆角日历卡片（部分日期下方有蓝色小圆点标记），下方是两张白色毛玻璃卡片，卡片内是风景照片缩略图与一行文字，底部悬浮一个白色毛玻璃胶囊形导航栏（两个图标）。手机左后方浮出一张半透明毛玻璃质感的大图卡片。背景为浅蓝到白的对角渐变，右上角有柔和蓝色光晕，背景散布几个虚化的白色圆角卡片。整体风格：干净、通透、明亮、现代、iOS 设计语言，浅色主题，柔和阴影，高质感 3D 渲染 + UI 界面展示。画面左上角与下方预留大片干净空白用于放置文字。不要出现任何文字。

**英文提示词（Midjourney / DALL·E 更稳）**

> App promotional poster, vertical 9:16. A modern smartphone in the center showing a calendar sharing app UI: soft light-blue gradient background, a white frosted-glass rounded calendar card on top with small blue dots under some dates, below it two white frosted-glass cards containing landscape photo thumbnails and a line of text, and a floating white frosted-glass pill-shaped tab bar with two icons at the bottom. A translucent frosted-glass photo card floats behind the phone on the left. Background is a light-blue to white diagonal gradient with a soft blue glow in the upper right and blurred white rounded cards scattered behind. Style: clean, airy, bright, modern, iOS design language, light theme, soft shadows, high-quality 3D render with UI mockup. Large clean empty areas at the top-left and bottom reserved for text. --no text, letters, watermark --ar 9:16

---

### 方案 B ｜ 功能特性海报（横版 · 三机并排）

- **尺寸**：1920 × 1080（16:9，适配官网头图 / 详情页 / PPT 封面）
- **构图**：三台手机等距并排，从左到右依次展示：
  ① 日历分享页 → ② 分享详情大图弹层 → ③ 干正事倒计时页（大号蓝色倒计时数字）
  三台手机上方各配一个功能标题留白区，底部一行 Slogan 留白区。
- **氛围**：统一浅蓝渐变底，手机下方有淡淡倒影，整体像一张产品介绍图。
- **画面内文案（留白区）**：
  - ① `每天一张精选` ② `点开看大图，一键存相册` ③ `系统级闹钟，杀进程也响`
  - 底部：`看分享，也干正事`

**中文提示词**

> 产品功能介绍图，横版 16:9。三台现代智能手机等距并排居中，每台手机屏幕展示同一款浅色系 App 的不同界面：第一台是日历分享页（白色毛玻璃日历卡片 + 下方照片卡片列表），第二台是照片大图详情页（一张大照片占满屏幕 + 底部毛玻璃信息条），第三台是倒计时页（巨大蓝色数字 00:25:00 + 蓝色圆形按钮）。背景为浅蓝到白的渐变，手机下方有柔和倒影，整体干净明亮、iOS 设计语言、浅色主题、高质感 3D 产品渲染。每台手机上方与画面底部预留干净空白用于放文字。不要出现任何文字。

**英文提示词**

> Product feature showcase image, horizontal 16:9. Three modern smartphones evenly spaced in the center, each showing a different screen of the same light-themed app: the first shows a calendar sharing page (white frosted-glass calendar card plus photo card list), the second shows a photo detail page (a large photo filling the screen with a frosted-glass info bar), the third shows a countdown timer page (huge blue digits 00:25:00 and a blue circular button). Light-blue to white gradient background, soft reflections under the phones, clean and bright, iOS design language, light theme, high-quality 3D product render. Clean empty areas above each phone and at the bottom reserved for text. --no text, letters, watermark --ar 16:9

---

### 方案 C ｜ 社交平台封面（方图 · 情绪向）

- **尺寸**：1080 × 1080（1:1，适配小红书 / 抖音封面 / 公众号头图）
- **构图**：画面主体是一叠**微微错开的毛玻璃照片卡片**（3–4 张，斜向堆叠），最上面一张是清晰的风景/城市照片；
  卡片右下角浮出一个**白色毛玻璃胶囊，内含蓝色铃铛图标与蓝色倒计时数字**；左上角放卡通头像 Logo。
- **氛围**：浅蓝渐变 + 柔和光斑，轻松、治愈、有收藏感。
- **画面内文案（留白区）**：
  - 主文案：`每天一张，值得收藏`
  - 副文案：`看分享 · 也干正事`

**中文提示词**

> 社交平台封面图，正方形 1:1。画面中央是 3 到 4 张微微错开、斜向堆叠的白色毛玻璃质感照片卡片，最上面一张是清晰明亮的风景照片；卡片右下方浮出一个白色毛玻璃胶囊形小卡片，内含一个蓝色铃铛图标和蓝色数字。左上角有一个圆形卡通男孩头像（黑框眼镜、黑 T 恤）。背景是浅蓝到白的柔和渐变，带几处虚化光斑，整体治愈、干净、明亮、有收集与珍藏的感觉，高质感 3D 渲染。画面左上与下方预留干净空白用于放文字。不要出现任何文字。

**英文提示词**

> Social media cover image, square 1:1. In the center, three to four slightly offset, diagonally stacked white frosted-glass photo cards, the top one showing a bright clear landscape photo; a small white frosted-glass pill card floats at the lower right of the stack containing a blue bell icon and blue digits. A round cartoon boy avatar (black-framed glasses, black t-shirt) at the top-left. Background is a soft light-blue to white gradient with blurred light spots, overall healing, clean, bright, with a sense of collecting and treasuring, high-quality 3D render. Clean empty areas at the top-left and bottom reserved for text. --no text, letters, watermark --ar 1:1

---

## 6. 通用提示词模板（想自己改时套这个）

```
【主体】移动 App 宣传图，画面展示「jack会员分享」App 的界面
【界面内容】<从第 2 节挑要展示的模块，例如：毛玻璃日历卡片 + 分享图片卡片列表>
【风格】浅色主题、iOS 设计语言、毛玻璃质感、干净通透、明亮、柔和阴影
【配色】背景浅蓝到白渐变 #EDF4FF→#F8FBFF，点缀色亮蓝 #3A83F7，文字深灰 #333333
【构图】<手机居中 / 三机并排 / 卡片堆叠>，<留白位置>
【渲染】高质感 3D 产品渲染 + UI 界面展示，超清，细节丰富
【负向】不要文字、不要字母、不要水印、不要暗色调、不要杂乱背景、不要人物手指变形
【尺寸】--ar 9:16（或 16:9 / 1:1）
```

### 负向提示词库（统一用）

> 文字，汉字，字母，数字水印，logo 错乱，暗色背景，深色主题，杂乱元素，过曝，噪点，低分辨率，模糊，畸变，手指畸形，多余的手机，界面元素重叠错乱

---

## 7. 交付与加字建议

1. **优先让 AI 只出画面**：中文字形目前仍是 AI 绘图的最大短板，图上出现乱码会直接毁掉宣传图。
2. **出图后在留白区叠字**：用 Figma / PPT / 醒图 / 剪映，字体用 `思源黑体 / 苹方 / 阿里巴巴普惠体`，主标题加粗、副标题常规灰 `#8994A9`。
3. **叠字配色**：主标题用深灰 `#333333`，关键动词（如「真正重要」「值得收藏」）用品牌蓝 `#3A83F7` 强调。
4. **必备元素**：品牌 Logo（`static/logo.png`）至少出现一次；如做下载引导图，右下角放抖音二维码（`static/douyin-qr.jpg`）。
5. **输出格式**：PNG（无损、用于叠字）；若需透明背景，请 AI 出图时明确「纯色背景」再抠图。
6. **一次多出**：同一提示词建议出 4 张挑 1 张；方案 A / B / C 各出 4 张，共 12 张可选。

---

## 8. 一句话投喂版（懒人用法）

> 把第 5 节对应方案的「中文提示词」整段复制粘贴给 AI 绘图工具，尺寸选对应比例，出图后按第 7 节在留白处叠中文。
> 想让 AI 顺便出文案，就再补一句：「请再给我 5 句 8 字以内的中文宣传短句，风格轻快、有收藏感。」
