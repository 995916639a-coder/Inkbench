# 画布页面

## 怎么用

在侧栏打开或新建画布。可以平移缩放、放置和编辑文本框与笔记卡片、移动对象、手绘和撤销最近一笔。卡片内容可以独立编辑。

## 代码怎么走

画布页面根据当前工具处理用户输入。放置笔记时，依次调用 `copyDocumentContent()`、`screenToCanvas()` 和 `addNoteCard()`。完成手绘时，调用 `finishStroke()` 整理轨迹，再调用 `addStroke()` 提交笔迹。每次变更通过 `onChange` 把更新后的画布交给工作台。

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `CanvasView`，`CanvasView.tsx` | `App` | 接收 `canvas`、`notes` 和 `onChange`。展示画布并报告变更。 |
| `createCanvas()`，`workspace/workspace.ts` | `App` | 接收新画布 ID 和可选标题，创建空白画布。 |
| `copyDocumentContent()`，`function/documents/document.ts` | `CanvasView` | 取得一份独立的笔记正文副本。 |
| `screenToCanvas()`、`panViewport()`、`zoomViewport()`，`function/viewport/viewport.ts` | `CanvasView` | 换算放置坐标，或计算更新后的视口。 |
| `addNoteCard()` 等对象操作，`function/canvas-items/canvasItems.ts` | `CanvasView` | 管理画布对象和笔迹，返回更新后的对象列表。 |
| `finishStroke()`，`function/drawing/drawing.ts` | `CanvasView` | 根据坐标序列生成一笔可提交的轨迹。 |
| `RichTextEditor`，`editor/RichTextEditor.tsx` | `CanvasView` | 接收笔记卡片的正文，报告更新后的正文。 |
