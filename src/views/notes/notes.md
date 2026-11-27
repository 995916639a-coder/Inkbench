# 笔记页面

## 怎么用

在工作台侧栏新建或打开笔记，直接编辑标题、段落、列表和代码块等内容。

点击「新建 → 导入 Markdown」选择一个 `.md` 或 `.markdown` 文件。工作台打开导入后的笔记，可以直接编辑。

## 代码怎么走

工作台使用文档模块创建笔记，把当前笔记交给笔记页面。页面组织标题和共用编辑器，再把编辑结果交回工作台保存。

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `NotesView`，`NotesView.tsx` | `App` | 接收 `note` 和 `onChange`。编辑后向 `App` 返回完整的更新笔记。 |
| `createNote()`，`function/documents/document.ts` | `App` | 接收新笔记 ID 和可选标题，创建空白笔记。 |
| `importMarkdownFile()`，`function/markdown-import/markdownImport.ts` | `App` | 接收侧栏文件选择器交来的文件，生成新笔记的标题和可编辑正文。 |
| `RichTextEditor`，`editor/RichTextEditor.tsx` | `NotesView` | 接收 `content` 和 `onChange`，报告更新后的结构化正文。 |
