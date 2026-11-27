# 工作区搜索

## 怎么用

点击侧栏「搜索工作区」或按 Ctrl+K，输入标题、正文或导图节点文字。可用方向键选择并按 Enter 打开。

## 代码怎么走

搜索函数读取当前工作区，查找笔记、画布卡片、文本框和导图节点中的文字。标题匹配优先，每个条目返回一条结果。命中导图节点时，结果会携带节点 ID 供画布定位。

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `index.ts` | `WorkspaceSearchDialog` | 导出搜索函数和结果类型。 |
| `searchWorkspace(workspace, input, untitled?)`，`searchWorkspace.ts` | `WorkspaceSearchDialog` | 接收本地工作区、搜索词和可选的本地化未命名标题，返回有序条目、命中文本片段和可选节点 ID。 |
