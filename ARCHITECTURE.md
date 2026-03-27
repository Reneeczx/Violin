# Technical Specification

## Document Control

- Product: `Violin`
- Doc type: `Tech Spec`
- Status: `Active`
- Last updated: `2026-03-27`
- Primary owner: `Engineering / Builder`
- Related docs:
  - [README.md](/d:/Violin/README.md)
  - [REQUIREMENTS.md](/d:/Violin/REQUIREMENTS.md)
  - [DEVELOPMENT.md](/d:/Violin/DEVELOPMENT.md)

## 1. Technical Summary

`Violin` 是一个纯前端静态应用，运行在浏览器中，无后端依赖。系统核心由五部分组成：

- 课程数据层：提供当前课程配置
- 计划生成层：把课程配置转换为每日/每周练习计划
- 播放控制层：统一管理参考音、节拍器、示范播放状态
- UI 展示层：按页面组织练习、调弦、进度和乐理界面
- 本地持久化层：保存练习记录和录音

## 2. Goals

- 为当前单课程、单周练习场景提供稳定的浏览器端练习体验
- 把播放状态收口到统一状态源，避免多套状态漂移
- 让课程内容的更新成本主要集中在一份静态数据文件
- 在 iPad / Safari 上保持尽量稳定的音频与录音行为

## 3. Non-Goals

- 不设计服务端 API
- 不支持实时协作
- 不支持多账号同步
- 不引入前端框架或构建工具

## 4. Runtime Context

### Deployment

- 平台：GitHub Pages
- 部署分支：`main`
- 运行方式：静态文件直接托管

### Browser Capabilities Used

- Web Audio API
- MediaRecorder
- IndexedDB
- Service Worker
- Manifest / PWA

## 5. High-Level Architecture

```text
lesson-current.js
  -> practice-plan.js
  -> ui/home-view.js + ui/plan-view.js

score-utils.js + music-theory.js
  -> ui/components.js
  -> ui/home-view.js

practice-player.js
  -> audio-engine.js
  -> EventBus
  -> ui/home-view.js / ui/tuner-view.js

recorder.js
  -> ui/home-view.js

tracking.js + state.js
  -> ui/progress-view.js / ui/home-view.js / ui/plan-view.js
```

## 6. Module Breakdown

### 6.1 Application Shell

- [app.js](/d:/Violin/js/app.js)

职责：

- 初始化导航和页面容器
- 注册路由
- 初始化各 view
- 注册 Service Worker
- 启动录音清理

### 6.2 Routing

- [router.js](/d:/Violin/js/router.js)

职责：

- 管理 hash 路由
- 切换当前 view
- 调用 `show / hide`

当前路由：

- `/`
- `/plan`
- `/tuner`
- `/progress`
- `/theory`
- `/theory/:topic`

### 6.3 Lesson Data

- [lesson-current.js](/d:/Violin/data/lesson-current.js)

职责：

- 保存当前活动课程
- 提供课程标题、教师备注、练习项、每日 progression

当前是单一全局入口：

- `window.CURRENT_LESSON`

### 6.4 Practice Plan Layer

- [practice-plan.js](/d:/Violin/js/practice-plan.js)

职责：

- 根据课程与 day number 生成当天练习计划
- 生成每周概览
- 计算日期显示

关键输出：

- `generateDailyPlan`
- `getWeekOverview`

### 6.5 Playback Domain

#### practice-player

- [practice-player.js](/d:/Violin/js/practice-player.js)

职责：

- 作为唯一播放会话源
- 管理 `idle | reference | click | demo`
- 统一处理 stop / mode switch / beat emit / note emit

为什么需要这一层：

- 避免 view 直接控制音频导致状态分裂
- 保证示范、节拍器、参考音的 ownership 清晰

#### audio-engine

- [audio-engine.js](/d:/Violin/js/audio-engine.js)

职责：

- 底层 `AudioContext` 管理
- 参考音合成
- 节拍器 click 调度
- 示范序列音频调度
- Safari / iPad 兼容性解锁

边界：

- `audio-engine` 只负责发声和底层恢复，不负责 UI 状态

### 6.6 Score And Theory Layer

- [score-utils.js](/d:/Violin/js/score-utils.js)
- [music-theory.js](/d:/Violin/js/music-theory.js)
- [ui/components.js](/d:/Violin/js/ui/components.js)

职责：

- 把谱面数据转成可渲染模型
- 生成示范播放时间线
- 解释速度和休止拆解
- 渲染乐谱 UI 组件

### 6.7 UI Layer

- [home-view.js](/d:/Violin/js/ui/home-view.js)
- [plan-view.js](/d:/Violin/js/ui/plan-view.js)
- [tuner-view.js](/d:/Violin/js/ui/tuner-view.js)
- [progress-view.js](/d:/Violin/js/ui/progress-view.js)
- [theory-view.js](/d:/Violin/js/ui/theory-view.js)

职责：

- 渲染页面
- 绑定交互事件
- 监听 `EventBus`
- 反映播放和录音状态

当前技术债：

- `home-view.js` 仍然承担较多职责，后续适合进一步拆分

### 6.8 Persistence Layer

#### Tracking

- [tracking.js](/d:/Violin/js/tracking.js)
- [state.js](/d:/Violin/js/state.js)

职责：

- 保存练习完成信息
- 聚合统计数据

#### Recording

- [recorder.js](/d:/Violin/js/recorder.js)

职责：

- 调用 `MediaRecorder`
- 将录音 `Blob` 存入 IndexedDB
- 读取、删除、播放录音

## 7. State Model

### Playback State

统一状态结构：

```text
{
  mode: 'idle' | 'reference' | 'click' | 'demo',
  sectionId: string | null,
  pitch: string | null,
  bpm: number | null,
  beatsPerMeasure: number
}
```

关键原则：

- `practicePlayer` 是播放真相源
- UI 不持有第二套播放状态
- `demo` 与 `click` 互斥
- 参考音、节拍器、示范切换时统一走 stop / reopen session

## 8. Event Contracts

事件总线：

- `practice:statechange`
- `practice:beat`
- `practice:notechange`
- `metronome:beat`

### practice:statechange

用途：

- 按钮文案
- 禁用态
- 高亮切换

### practice:beat

用途：

- 节拍视觉反馈
- 当前拍高亮

### practice:notechange

用途：

- 当前音符高亮
- 当前小节跟随

## 9. Core Runtime Flows

### 9.1 Daily Practice Render Flow

1. 读取 `window.CURRENT_LESSON`
2. 计算 day number
3. 生成 `dailyPlan`
4. `home-view` 渲染练习卡片

### 9.2 Open String Tap Flow

1. 用户点击空弦按钮
2. UI 在手势回调中确保音频上下文已解锁
3. `practicePlayer.startReference`
4. `audio-engine.startReferenceTone`
5. `practice:statechange`
6. UI 更新按钮高亮

### 9.3 Piece Demo Flow

1. 用户点击示范播放
2. UI 调用 `practicePlayer.startDemo`
3. `score-utils` 生成播放时间线
4. `audio-engine.playSequence`
5. `practicePlayer` 发送 beat / notechange 事件
6. UI 更新拍号、音符和小节高亮

### 9.4 Recording Flow

1. 用户点击录音
2. `MediaRecorder` 启动
3. 停止时生成 `Blob`
4. 写入 IndexedDB
5. UI 刷新录音列表

## 10. Storage Design

### IndexedDB

库名：

- `violin-practice`

Store：

- `recordings`

索引：

- `exerciseId`
- `dayNumber`
- `weekOf`
- `createdAt`

### Other Local State

- 练习完成状态与统计保存在浏览器本地存储
- 当前实现适合单设备、单用户场景

## 11. PWA / Caching Strategy

- [manifest.json](/d:/Violin/manifest.json)
- [sw.js](/d:/Violin/sw.js)

策略：

- `index.html / js / css / manifest / lesson data` 使用 `network-first`
- icons 使用 `cache-first`

目的：

- 降低旧脚本被长期缓存的概率
- 同时保留基本离线资源能力

## 12. Testing Strategy

当前测试以 Node 内置测试为主。

覆盖重点：

- 播放状态机
- 谱面时间线与拍级对齐
- 乐理辅助逻辑
- iPad / Apple 设备提示逻辑
- 音频上下文解锁兼容逻辑

测试入口：

```powershell
node --test --experimental-default-type=module tests/*.test.js
```

## 13. Operational Considerations

- 任何影响部署的推送前都必须确认：
  - 当前分支
  - 默认分支
  - 实际部署分支
- iPad 真机测试必须把设备静音模式和媒体音量纳入排查

## 14. Known Technical Risks

- `home-view.js` 过大，后续继续演进时维护成本高
- 当前课程数据是单文件静态配置，不适合长期扩展到多课程
- 浏览器端音频与录音能力受设备环境影响明显
- 本地存储缺少跨设备同步

## 15. Future Evolution Paths

潜在后续方向：

- 拆分 `home-view` 降低复杂度
- 抽象课程数据格式，支持多课程
- 为老师提供更轻量的课程编辑流程
- 在不引入重后端的前提下增强数据导入导出能力
