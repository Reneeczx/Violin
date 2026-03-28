# Development Guide

## 1. Local Run

项目是纯静态站点，无需安装依赖即可运行。

```powershell
py -m http.server 8124 --bind 127.0.0.1
```

访问：

```text
http://127.0.0.1:8124/index.html
```

## 2. Test Commands

### Unit Tests

```powershell
node --test --experimental-default-type=module tests/*.test.js
```

### Syntax Check

```powershell
node --check js/app.js
node --check js/audio-engine.js
node --check js/practice-player.js
```

## 3. Requirements Before Code

Before implementing a new feature in `Violin`, complete this lightweight checklist:

1. **What**
   - Input
   - Output
   - Edge cases
   - Completion criteria
2. **UI**
   - Layout
   - Key elements
   - Interaction flow
   - User-visible states at each step
3. **Constraints**
   - Device and browser
   - Audio / recording / offline behavior
   - Performance expectations
   - Platform-specific risks, especially `iPad Safari`
4. **MVP boundary**
   - Must-have
   - Nice-to-have
   - Explicit `Not now` list

Classify unresolved items before coding:

- `Dialogue`: can be clarified through discussion
- `Mockup`: needs a visual prototype to evaluate
- `Spike`: needs a technical feasibility check

Rules:

- For UI-heavy changes, produce a static HTML mockup first and confirm look-and-feel before adding logic.
- For platform-sensitive changes, produce a minimal technical spike first. Typical examples: audio unlock, recording permissions, PWA install, offline caching.
- Do not start full implementation until the must-have scope, main interaction flow, and acceptance criteria are explicit.

## 4. Common Change Workflows

### Update Weekly Lesson Content

主要文件：

- [lesson-current.js](/d:/Violin/data/lesson-current.js)

改动时注意：

- `open-strings` 的 `strings` 数据是否完整
- `piece` 的 `measures`、`timeSignature`、`bpm` 是否一致
- `progression.day1 ~ day7` 是否完整

### Adjust Playback or Audio

优先检查：

- [practice-player.js](/d:/Violin/js/practice-player.js)
- [audio-engine.js](/d:/Violin/js/audio-engine.js)
- [home-view.js](/d:/Violin/js/ui/home-view.js)
- [playback-controls.js](/d:/Violin/js/ui/playback-controls.js)
- [score-display.js](/d:/Violin/js/ui/score-display.js)

原则：

- 播放状态优先在 `practicePlayer` 收口
- `audio-engine` 只负责发声和底层解锁/调度
- 不要让 view 直接持有第二套播放状态

### Update UI Copy or Learning Aids

优先检查：

- [home-view.js](/d:/Violin/js/ui/home-view.js)
- [score-display.js](/d:/Violin/js/ui/score-display.js)
- [theory-view.js](/d:/Violin/js/ui/theory-view.js)
- [music-theory.js](/d:/Violin/js/music-theory.js)

### Update Learning Mode

Start here:

- [learning.html](/d:/Violin/learning.html)
- [learning-app.js](/d:/Violin/js/learning-app.js)
- [learn-data.js](/d:/Violin/js/learn-data.js)
- [learn-view.js](/d:/Violin/js/ui/learn-view.js)
- [learn-data.test.js](/d:/Violin/tests/learn-data.test.js)

Rules:

- Keep the learning experience independent from the main app shell and bottom navigation
- Add or edit learning content in `learn-data.js` first; keep the view logic generic
- Prefer linking to real project files and modules instead of writing abstract tutorial copy
- Keep the graph as the visual center; concepts and code reading should stay tied to the currently selected module
- Limit code reading to one or two real snippets per module to avoid beginner overload
- Run `node --test --experimental-default-type=module tests/*.test.js` after changing module links, task files, or defaults

## 5. iPad / iPhone Verification

每次影响音频、PWA 或触摸交互的改动，都建议在真机确认：

- Safari 中空弦按钮是否出声
- 调弦页参考音是否出声
- 示范播放和节拍器是否正常
- PWA 主屏幕模式是否正常
- 静音模式关闭后是否能稳定听到声音

## 6. Deployment Workflow

- 发布分支：`main`
- 影响部署前必须确认：
  - 当前工作分支
  - 仓库默认分支
  - 实际部署分支

如果三者不一致，先停下确认，不要直接推送。

## 7. Maintenance Notes

- 变更用户可感知行为时，更新 [README.md](/d:/Violin/README.md)
- 变更需求范围或目标时，更新 [REQUIREMENTS.md](/d:/Violin/REQUIREMENTS.md)
- 变更模块职责或数据流时，更新 [ARCHITECTURE.md](/d:/Violin/ARCHITECTURE.md)
- 每次发版更新 [CHANGELOG.md](/d:/Violin/CHANGELOG.md) 和 [VERSION](/d:/Violin/VERSION)
- 每次复盘沉淀到 [LESSONS.md](/d:/Violin/LESSONS.md)
