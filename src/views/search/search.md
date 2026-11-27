# 搜索工作区

## 怎么用

在侧栏点击「搜索工作区」或按 Ctrl+K，输入关键词。点击结果打开对应笔记或画布，也可以用上下键和 Enter 操作。匹配导图节点时会跳到该节点。

## 代码怎么走

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `WorkspaceSearchDialog`，`WorkspaceSearchDialog.tsx` | `App` | 接收工作区和选择回调，显示搜索框及结果。 |
| `searchWorkspace()`，`function/workspace-search` | `WorkspaceSearchDialog` | 根据搜索词返回匹配项。 |
| `onOpenResult()` | `WorkspaceSearchDialog` | 将用户选择的条目和可选节点交给 `App` 打开。 |
| `search.css` | `WorkspaceSearchDialog` | 定义弹窗、输入及结果列表的样式。 |
