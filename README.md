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

## Standalone Learning Page

- Preview: `http://127.0.0.1:8124/learning.html`
- Entry files: `learning.html`, `js/learning-app.js`, `js/learn-data.js`, `js/ui/learn-view.js`, `css/learning.css`
- Scope: kept separate from the main practice app shell and bottom navigation
- Includes: dependency graph with current flow highlight, focused concepts for the selected module, and one to two code-reading snippets per core module

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

- 当前只读取一份活动课程数据，不支持多课程管理
- 当前没有后端，同步和账号系统不在范围内
- 录音保存在浏览器本地，换设备不会同步
