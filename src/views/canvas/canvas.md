# 画布页面

## 怎么用

在侧栏打开或新建画布。选「文本」后点击画布放置文本框。选「添加笔记」并挑一篇笔记，再点击画布放置独立副本。双击对象或用编辑按钮修改内容，拖动顶部可移动对象。「画笔」用于手绘，「撤销最近一笔」用于移除最后一笔。选择平移工具或按住鼠标中键拖动画布，滚轮用于缩放。

选「添加笔记 → 导入 Markdown 到画布」并点击画布放置卡片，也可以直接把 `.md` 或 `.markdown` 文件拖到画布。双击卡片可继续编辑。

打开底部「思维导图」可拖入椭圆或长方形，也可以选择形状后点击放置。拖动节点可移动位置，选中后拖右下角可调大小，双击可改文字。「连接节点」依次选两个节点，「从 Markdown 生成」根据标题和列表自动展开导图。

如果已经在应用内编写或导入笔记，选「从已有笔记生成」可直接把它的结构变成导图。

新建画布后可以点击「插入示例导图」，练习编辑节点和连线。

在思维导图菜单中，点「搜索节点」后选中结果即可定位，点「显示全部节点」可缩放到整组节点。

从工作区搜索打开命中的导图节点时，画布会居中显示该节点。

选中节点后可一键加子节点并开始输入，也可用形状和颜色按钮调整外观。

在思维导图菜单中点击「导出 PNG」，可下载包含全部导图节点和连线的图片。

点击「自动整理导图」按层级排列已有节点。继续编辑导图之前，可以通过「撤销整理」恢复上一次位置。

点选连线后使用「编辑连线」，可为关系写一个短名称。

选中节点后可用方向键微调位置，按住 Shift 移动得更远。正在拖动、调整大小、平移或绘制时，按 Esc 可取消。

在选择工具下按 Ctrl+Z 或 Ctrl+Shift+Z，可撤销或重做导图操作。思维导图菜单也有对应入口。

## 代码怎么走

画布页面根据当前工具处理用户输入。放置已有笔记时，调用 `copyDocumentContent()` 取得副本。导入文件时，调用 `importMarkdownFile()` 取得可编辑正文。两者都用 `screenToCanvas()` 换算位置，由 `addNoteCard()` 放到画布。完成手绘时，调用 `finishStroke()` 整理轨迹，再调用 `addStroke()` 提交笔迹。每次变更通过 `onChange` 把更新后的画布交给工作台。

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `CanvasView`，`CanvasView.tsx` | `App` | 接收 `canvas`、`notes`、`onChange` 和可选的 `revealNode`，展示并更新画布。 |
| `CanvasToolbar`，`CanvasToolbar.tsx` | `CanvasView` | 接收工具、可选笔记和缩放比例，通过回调报告工具操作。笔记列表可用于放置卡片或生成导图。 |
| `CanvasItemsLayer`，`CanvasItemsLayer.tsx` | `CanvasView` | 显示卡片、文本框与笔迹，提供编辑或删除这些对象的界面。 |
| `useCanvasGestures()`，`useCanvasGestures.ts` | `CanvasView` | 管理按下、移动、放开和取消期间的预览，完成后把坐标、尺寸、视口或笔迹交回画布。 |
| `useMindMapHistory()`，`useMindMapHistory.ts` | `CanvasView` | 记录当前打开画布的导图操作，返回可撤销或重做的数据。连续输入会合并记录。 |
| `MindMapLayer`，`MindMapLayer.tsx` | `CanvasView` | 接收节点、连线、选择和编辑状态，绘制节点与连线，通过回调报告改字和调整大小。 |
| `MindMapSelectionActions`，`MindMapLayer.tsx` | `CanvasView` | 根据选中的元素，提供改字、添加子节点、切换形状和配色、命名连线及删除操作。 |
| `MindMapOutline`，`MindMapOutline.tsx` | `CanvasView` | 按文字搜索和显示节点，将用户选中的节点交给画布定位。 |
| `createCanvas()`，`workspace/workspace.ts` | `App` | 接收新画布 ID 和可选标题，创建空白画布。 |
| `copyDocumentContent()`，`function/documents/document.ts` | `CanvasView` | 取得一份独立的笔记正文副本。 |
| `importMarkdownFile()`，`function/markdown-import/markdownImport.ts` | `CanvasView` | 从选择或拖入的文件取得卡片标题和正文。 |
| `createMarkdownMindMap()` 等导图操作 | `CanvasView` | 把导入内容转换成节点和连线，或更新手动创建的元素。 |
| `organizeMindMap()`，`function/mind-map/organizeMindMap.ts` | `CanvasView` | 重新排列现有节点。画布记住整理前的位置，用于撤销。 |
| `renderMindMapPng()`，`function/mind-map-export/renderMindMapPng.ts` | `CanvasView` | 把导图节点和连线渲染成 PNG，供页面下载。 |
| `screenToCanvas()`、`panViewport()`、`zoomViewport()`，`function/viewport/viewport.ts` | `CanvasView` | 换算放置坐标，或计算更新后的视口。 |
| `fitViewport()`，`function/viewport/viewport.ts` | `CanvasView` | 根据目标节点范围调整缩放和位置。 |
| `addNoteCard()` 等对象操作，`function/canvas-items/canvasItems.ts` | `CanvasView` | 管理画布对象和笔迹，返回更新后的对象列表。 |
| `finishStroke()`，`function/drawing/drawing.ts` | `CanvasView` | 根据坐标序列生成一笔可提交的轨迹。 |
| `RichTextEditor`，`editor/RichTextEditor.tsx` | `CanvasView` | 接收笔记卡片的正文，报告更新后的正文。 |
