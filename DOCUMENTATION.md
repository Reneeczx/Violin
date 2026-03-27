# Documentation Workflow

这份文档定义：项目在不同阶段结束时，必须产出或更新哪些文档。

## Stage-to-Doc Mapping

### 1. Discovery / Requirements

阶段目标：

- 搞清楚问题、用户、目标和范围

必须更新：

- [REQUIREMENTS.md](/d:/Violin/REQUIREMENTS.md)
- [TODOS.md](/d:/Violin/TODOS.md)

至少记录：

- 目标用户
- 核心问题
- 当前范围 / 明确不做
- 当前优先级

### 2. Design / Architecture

阶段目标：

- 锁定模块边界、数据流和关键设计决策

必须更新：

- [ARCHITECTURE.md](/d:/Violin/ARCHITECTURE.md)

至少记录：

- 关键模块职责
- 状态流 / 数据流
- 关键设计决策
- 当前已知风险

### 3. Implementation

阶段目标：

- 让代码与文档保持一致，不让文档滞后

视改动更新：

- [README.md](/d:/Violin/README.md)
- [DEVELOPMENT.md](/d:/Violin/DEVELOPMENT.md)

至少记录：

- 新功能入口
- 新命令 / 新维护方式
- 真机或环境注意事项

### 4. Release

阶段目标：

- 对外说明这次发了什么

必须更新：

- [CHANGELOG.md](/d:/Violin/CHANGELOG.md)
- [VERSION](/d:/Violin/VERSION)

至少记录：

- 版本号
- 用户可感知变更
- 修复内容

### 5. Retrospective

阶段目标：

- 把经验变成复用知识

必须更新：

- [LESSONS.md](/d:/Violin/LESSONS.md)

至少记录：

- 问题根因
- 判断失误
- 后续可复用的调试或设计原则

## Stage Exit Rule

一个阶段只有在“代码/产出完成 + 对应文档已更新”后，才算真正完成。

不要把文档当作最后补写的附属品；它是阶段产出的组成部分。

## Minimum Checklist

每次阶段结束前，至少问自己：

1. 这次改动改变了什么用户认知？
2. 这次改动改变了什么系统边界？
3. 这次改动带来了什么新的维护方式？
4. 哪份文档现在已经过期？

如果其中任何一题答案是“有变化”，对应文档就必须更新。
