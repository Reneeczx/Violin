# Learning Subapp

`learning/` 是仓库内独立的学习子应用。它服务的是“理解项目如何被设计和实现”，而不是练习功能本身。

## 1. Scope

这个子应用只回答 3 个问题：

- 模块之间怎么连接
- 当前主线里的数据或调用怎么流动
- 当前模块最值得先懂的概念和代码是什么

它刻意不做这些事：

- 不接入主应用底部导航
- 不复用主应用 Router
- 不扩展成完整术语表或课程系统

## 2. Entry Map

- `learning/index.html`
  - 学习子应用入口
  - 通过 `../js/page-bootstrap.js` 处理 `file:///` 直开提示和模块注入
- `learning/js/app.js`
  - 只负责启动学习页
  - 入口非常薄，真正逻辑在 view
- `learning/js/learn-data.js`
  - 学习内容源
  - 包含模块、主线、术语、代码解读、默认选中项和关系构建逻辑
- `learning/js/ui/learn-view.js`
  - 通用渲染层
  - 负责模块图、当前主线、概念区和代码解读区
- `learning/css/learning.css`
  - 正式学习页样式
- `learning/mockup.html`
  - 静态 mockup，专门用于先看布局和信息密度

兼容入口：

- `../learning.html`
- `../learning-mockup.html`

这两个文件只是跳转页，用来兼容旧链接和旧书签。

## 3. Shared vs Isolated

有意共享：

- 根目录基础样式：`../css/variables.css`、`../css/base.css`、`../css/components.css`
- 根目录页面启动保护：`../js/page-bootstrap.js`
- 根目录测试目录：`../tests/`

有意隔离：

- 学习页自己的 HTML 入口
- 学习页自己的 JS 入口和视图逻辑
- 学习页自己的样式文件
- 主应用的 Router、底部导航和练习壳层

如果你在学习页里又开始依赖主应用导航或 hash 路由，说明边界又被拉回去了。

## 4. Editing Rules

改学习内容时，优先顺序固定为：

1. 先改 `learning/js/learn-data.js`
2. 再看 `learning/js/ui/learn-view.js` 是否真的需要支持新结构
3. 最后再改样式

保持这几个约束：

- 图始终是第一视觉中心
- 概念和代码解读必须围绕“当前选中模块”
- 每个模块只保留 1 到 2 段代码解读
- 术语只保留初学者现在需要的，不做百科
- 尽量引用真实文件和真实模块，不写悬空教程文案

## 5. Common Changes

### Add a New Module

至少同步这几处：

- `modules`
- `flows`
- `terms` 或模块 `concepts`
- `codeReadings`

如果模块关系变了，也要检查关系图和默认主线是否仍然成立。

### Update Concepts

- 先判断它是不是当前模块“必须知道”的概念
- 如果只是背景知识，不要加进来
- 每个模块的概念卡片控制在 3 张以内

### Update Code Reading

- 只挑最能解释职责或数据转换的代码段
- 解释重点放在“为什么这么写”，不要抄源码
- 片段必须对应真实文件

## 6. Local Preview

在仓库根目录运行：

```powershell
py -m http.server 8124 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:8124/learning/
```

不要把 `learning/index.html` 当成本地静态文件直接双击预览。`file:///` 模式下页面会显示本地服务器提示，这是预期行为。

## 7. Verification

改完学习子应用后，至少跑这些：

```powershell
node --check learning/js/app.js
node --check learning/js/learn-data.js
node --check learning/js/ui/learn-view.js
node --test --experimental-default-type=module tests/*.test.js
```

如果你改了模块路径、代码解读、默认模块或主线，测试必须重新跑一次。
