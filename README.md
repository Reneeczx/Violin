# Violin

面向小提琴初学者的练习 Web App，当前围绕“一周一课”的家庭练习场景设计。应用提供每日练习卡片、四根空弦练习、示范播放、节拍器、调弦、录音、周计划、进度统计和基础乐理说明，支持在手机、iPad 和桌面浏览器中使用，并可作为 PWA 安装。

## Current Scope

- 当前课程数据来源于 [lesson-current.js](/d:/Violin/data/lesson-current.js)
- 当前内容覆盖“Lesson 1 - Open Strings”
- 当前部署方式为 GitHub Pages，主分支为 `main`
- 当前版本见 [VERSION](/d:/Violin/VERSION)

## Main Features

- 今日练习：首页按当天生成练习计划，并按卡片展示每项练习
- 空弦练习：支持 `E / A / D / G` 参考音播放、节拍器、录音
- 曲目练习：支持谱面展示、拍号编号、速度切换、示范播放、节拍器互斥、录音
- 调弦助手：提供四根空弦参考音和依次播放
- 基础乐理：解释速度记号、休止符、空弦与音名等初学者常见概念
- 进度统计：展示连续练习天数、总练习时长、成就和本周进度
- 本周计划：按 7 天展示主题、时长和每日重点

- 学习页：提供独立的模块关系图、当前主线、关键概念和核心代码解读，帮助用项目本身理解实现细节

## Tech Stack

- 纯前端静态应用，无构建步骤
- 原生 JavaScript + HTML + CSS
- Web Audio API：参考音、节拍器、示范播放
- MediaRecorder + IndexedDB：录音与本地存储
- Service Worker + Manifest：PWA 安装和缓存
- Node 内置测试：关键逻辑的单元测试

## Project Structure

```text
author/               weekly authoring subapp
css/                  UI 样式
data/                 当前课程数据
icons/                PWA 图标
js/
  ui/                 各页面视图和通用组件
  audio-engine.js     底层音频调度
  practice-player.js  统一播放状态机
  practice-plan.js    每日/每周练习计划生成
  recorder.js         录音和本地存储
tests/                单元测试
learning/             interactive learning subapp
```

## Local Development

### Start

```powershell
py -m http.server 8124 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:8124/index.html
```

### Test

```powershell
node --test --experimental-default-type=module tests/*.test.js
```

### Syntax Check

```powershell
node --check js/app.js
node --check js/audio-engine.js
```

## Learning Subapp

- Preview: `http://127.0.0.1:8124/learning/`
- Entry files: `learning/index.html`, `learning/js/app.js`, `learning/js/learn-data.js`, `learning/js/ui/learn-view.js`, `learning/css/learning.css`
- Scope: isolated as a repo-local subapp, separate from the main practice app shell and bottom navigation
- Includes: dependency graph with current flow highlight, focused concepts for the selected module, and one to two code-reading snippets per core module
- Maintenance: `learning/README.md`

## Authoring Subapp

- Preview: `http://127.0.0.1:8124/author/`
- Entry files: `author/index.html`, `author/js/app.js`, `author/js/ui/author-view.js`, `author/css/author.css`
- Scope: isolated builder-facing weekly authoring flow; not linked from the student bottom navigation
- Workflow: save a draft shell, export `week-manifest.json` and `codex-prompt.md`, generate `week-package.json` in Codex IDE, then import, preview, and publish locally
- Exported context now includes planner role, auto-generated learning profile, suggested coaching focus, confirmed weekly focus, runtime practice budget, carry-over context, and JSON self-check guidance
- Storage:
  - week packages in `localStorage` via [week-package-store.js](/d:/Violin/js/week-package-store.js)
  - uploaded score assets in IndexedDB via [source-asset-store.js](/d:/Violin/js/source-asset-store.js)
- Maintenance: `author/README.md`

## Deployment

- GitHub Pages 发布分支：`main`
- 建议任何影响线上访问的提交都先确认：
  - 当前工作分支
  - 仓库默认分支
  - 实际部署分支
- iPad / iPhone 真机测试时，需要确认：
  - 静音模式已关闭
  - 媒体音量已打开
  - Safari / PWA 已刷新到最新版本

## Documentation Map

- 项目概览： [README.md](/d:/Violin/README.md)
- 产品需求文档（PRD）： [REQUIREMENTS.md](/d:/Violin/REQUIREMENTS.md)
- 技术设计文档（Tech Spec）： [ARCHITECTURE.md](/d:/Violin/ARCHITECTURE.md)
- 开发与维护： [DEVELOPMENT.md](/d:/Violin/DEVELOPMENT.md)
- 阶段文档流程： [DOCUMENTATION.md](/d:/Violin/DOCUMENTATION.md)
- 变更历史： [CHANGELOG.md](/d:/Violin/CHANGELOG.md)
- 项目经验： [LESSONS.md](/d:/Violin/LESSONS.md)
- 待办事项： [TODOS.md](/d:/Violin/TODOS.md)

## Current Constraints

### Published Weekly Authoring And Staff Notation

- [lesson-current.js](/d:/Violin/data/lesson-current.js) remains the embedded fallback for the active week.
- User-visible history now comes from locally published week packages, plus a single readonly embedded baseline for the most recent real lesson week when the current week has not been published yet.
- The authoring flow lives in the standalone [author/index.html](/d:/Violin/author/index.html) subapp. v1 uses `external_codex_manual`: export context from the app, review the auto-generated learning profile plus coaching focus, generate JSON in Codex IDE, then import and publish locally.
- The plan page now shows published weeks in its horizontal selector, and may also show the previous real lesson as a readonly baseline. Historical entries are always read-only and surface local completion records only when they exist.
- Late-entry weeks are supported through `publishedFromDayNumber` plus per-day `planned | inactive | catchup` statuses. Runtime planning still reuses [practice-plan.js](/d:/Violin/js/practice-plan.js).
- [lesson-archive.js](/d:/Violin/data/lesson-archive.js) is now seed/reference data only. It no longer drives the runtime history shown to students.
- Piece cards now support two notation views: the original beginner-friendly notation and a generated staff-notation view.
- The staff view is generated from existing `measures`, `timeSignature`, and `bpm` data. It is a simplified learning score, not a pixel-perfect reproduction of the teacher's original sheet.
- The notation coordinator lives in [score-display.js](/d:/Violin/js/ui/score-display.js), while SVG staff building and rendering live in [staff-notation.js](/d:/Violin/js/staff-notation.js) and [staff-display.js](/d:/Violin/js/ui/staff-display.js).
- In staff mode, clicking notes, rests, tempo, or time-signature symbols opens an inline explainer backed by [music-theory.js](/d:/Violin/js/music-theory.js), with an optional deep link into the theory page.

- 当前只读取一份活动课程数据，不支持多课程管理
- 当前没有后端，同步和账号系统不在范围内
- 录音保存在浏览器本地，换设备不会同步
