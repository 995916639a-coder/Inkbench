# Markdown 文件导入

## 怎么用

在侧栏点击「新建 → 导入 Markdown」可从本地文件创建笔记。在画布点击「添加笔记 → 导入 Markdown 到画布」后选择放置位置，也可以直接把文件拖到画布。

一次导入一个 UTF-8 编码的 `.md` 或 `.markdown` 文件。文件名去掉扩展名后作为笔记或卡片标题，导入后可编辑和保存。

## 代码怎么走

`importMarkdownFile()` 读取文件，用 Remark 解析 Markdown，然后将标题、段落、列表、引用、代码、链接等转换为编辑器使用的结构化正文。任务清单保留 `[ ]` 和 `[x]`，表格与 HTML 保留为可编辑的文本，图片和相对链接保留 Markdown 写法。

侧栏导入由 `App` 加入工作区笔记。画布导入由 `CanvasView` 使用 `addNoteCard()` 放入当前画布。两处共用自动保存。

| 文件或入口 | 调用方 | 输入与结果 |
| --- | --- | --- |
| `index.ts` | `App`、`CanvasView` | 公开 Markdown 文件导入入口。 |
| `importMarkdownFile(file)`，`markdownImport.ts` | `App`、`CanvasView` | 接收文件选择器或拖放提供的 `File`，返回标题和正文。格式或编码不合适时返回错误，由界面提示。 |
