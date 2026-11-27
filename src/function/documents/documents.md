# 文档

工作台用这里创建空白笔记，画布页面用这里取得独立的正文副本。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 向上层提供使用文档能力的入口。 |
| `document.ts` | 定义笔记与正文数据，实现创建和复制。Markdown 导入复用 `DocumentNode` 和 `DocumentMark` 表示正文节点和格式。 |

| 操作 | 调用方 | 输入 | 输出 |
| --- | --- | --- | --- |
| `createNote(id, title?)` | `App` | 工作台分配的笔记 ID 和可选标题 | 含标题和空白正文的 `Note` |
| `copyDocumentContent(content)` | `CanvasView` | 笔记的结构化正文 `DocumentContent` | 可独立编辑的深拷贝 |
