# Architecture

## 1. Overview

`Violin` 是一个无后端的静态前端应用。核心架构是：

- `lesson-current.js` 提供课程数据
- `practice-plan.js` 把课程数据转成今日/本周练习计划
- `practice-player.js` 统一管理播放状态
- `audio-engine.js` 负责实际发声
- `ui/*` 负责页面渲染和交互
- `recorder.js` 负责录音与本地存储

## 2. Runtime Modules

### App Shell

- 入口： [app.js](/d:/Violin/js/app.js)
- 职责：
  - 初始化路由
  - 初始化各个 view
  - 注册 service worker
  - 启动录音清理

### Routing

- 路由：`/`, `/plan`, `/tuner`, `/progress`, `/theory`
- 由 [router.js](/d:/Violin/js/router.js) 和 [app.js](/d:/Violin/js/app.js) 管理

### Views

- [home-view.js](/d:/Violin/js/ui/home-view.js)：今日练习主界面
- [plan-view.js](/d:/Violin/js/ui/plan-view.js)：本周计划
- [tuner-view.js](/d:/Violin/js/ui/tuner-view.js)：调弦
- [progress-view.js](/d:/Violin/js/ui/progress-view.js)：进度
- [theory-view.js](/d:/Violin/js/ui/theory-view.js)：基础乐理

### Audio

- [practice-player.js](/d:/Violin/js/practice-player.js)
  - 唯一播放会话源
  - 管理 `idle | reference | click | demo`
  - 发出 `practice:statechange`、`practice:beat`、`practice:notechange`
- [audio-engine.js](/d:/Violin/js/audio-engine.js)
  - Web Audio API 封装
  - 负责 `ensureContext`、参考音、节拍器 click、示范音符调度

### Music Model

- [practice-plan.js](/d:/Violin/js/practice-plan.js)：按天生成练习计划
- [score-utils.js](/d:/Violin/js/score-utils.js)：谱面模型和播放时间线
- [music-theory.js](/d:/Violin/js/music-theory.js)：乐理说明、速度展示和休止拆解
- [open-string-data.js](/d:/Violin/js/open-string-data.js)：空弦元数据统一入口

### Storage

- [tracking.js](/d:/Violin/js/tracking.js)：练习完成状态和统计
- [state.js](/d:/Violin/js/state.js)：汇总统计读取
- [recorder.js](/d:/Violin/js/recorder.js)：通过 IndexedDB 保存录音

## 3. Data Flow

### Daily Practice Flow

1. `lesson-current.js` 挂到 `window.CURRENT_LESSON`
2. `home-view` 调用 `generateDailyPlan`
3. 计划被渲染成练习卡片
4. 用户操作按钮
5. `practicePlayer` 切换播放模式
6. `audioEngine` 发声
7. `EventBus` 事件回到 UI，更新按钮、高亮和状态

### Demo Playback Flow

1. 曲谱 `measures`
2. `score-utils.buildPlaybackTimeline`
3. `practicePlayer.startDemo`
4. `audioEngine.playSequence`
5. `practicePlayer` 同步发出 beat / notechange 事件
6. `home-view` 更新当前拍和当前音符高亮

### Recording Flow

1. 用户点击录音
2. `MediaRecorder` 开始采集
3. 录音停止后转成 `Blob`
4. 写入 IndexedDB
5. UI 读取并展示录音列表

## 4. Deployment Architecture

- 托管方式：GitHub Pages
- 部署分支：`main`
- PWA：
  - [manifest.json](/d:/Violin/manifest.json)
  - [sw.js](/d:/Violin/sw.js)
- Service Worker 策略：
  - app shell：`network-first`
  - icons：`cache-first`

## 5. Key Architecture Decisions

### Single Source of Playback Truth

播放状态由 `practicePlayer` 统一管理，避免 UI、节拍器和音频层各自维护独立状态。

### Static Lesson Configuration

课程内容用静态 `lesson-current.js` 配置，降低后台复杂度，适合一周一课的轻量场景。

### Browser-Local Persistence

录音和进度保存在浏览器本地，避免引入账号和服务端。

## 6. Current Risks

- `home-view.js` 仍然偏大，后续应继续拆分
- 当前仅支持一份活动课程数据
- 浏览器和设备音频行为存在环境差异，iPad 仍需真机验证
- 本地存储不跨设备同步
