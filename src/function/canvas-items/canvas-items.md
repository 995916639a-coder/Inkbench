# 画布对象

画布页面在用户放置、拖动、编辑、删除对象或完成手绘时调用这里。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 提供画布对象的对外入口。 |
| `canvasItems.ts` | 定义卡片、文本框和已提交笔迹，并实现对象更新。 |

| 操作 | 调用方 | 输入 | 输出 |
| --- | --- | --- | --- |
| `addNoteCard(items, id, position, note)` | `CanvasView` | 对象列表、新 ID、放置坐标和已复制的笔记标题与正文 | 包含新笔记卡片的列表 |
| `addTextBox(items, id, position)` | `CanvasView` | 对象列表、新 ID 和放置坐标 | 包含空白文本框的列表 |
| `moveCanvasItem(items, id, position)` | `CanvasView` | 对象列表、文本框或卡片 ID 和新位置 | 位置更新后的列表 |
| `updateNoteCard(items, id, note)` | `CanvasView` | 对象列表、卡片 ID 和新的卡片标题与正文 | 卡片内容更新后的列表 |
| `updateTextBox(items, id, text)` | `CanvasView` | 对象列表、文本框 ID 和新文本 | 文本框更新后的列表 |
| `removeCanvasItem(items, id)` | `CanvasView` | 对象列表和选中的对象 ID | 移除对象后的列表 |
| `addStroke(items, id, points, annotation?)` | `CanvasView` | 对象列表、新 ID、画布坐标及可选的箭头样式与弯曲方向 | 包含新笔迹或箭头的列表 |
| `undoLastStroke(items)` | `CanvasView` | 对象列表 | 移除最新一笔后的列表 |
