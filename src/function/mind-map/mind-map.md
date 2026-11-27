# 思维导图

## 怎么用

打开画布底部的「思维导图」。可以把椭圆节点、长方形节点拖到画布，也可以点击形状后再点击放置。拖动节点可以移动它，拖动选中节点右下角的手柄可以调整大小，双击可以编辑文字。选择「连接节点」，依次点击两个节点即可连线。

选择「从 Markdown 生成」并打开本地文件，画布会生成一组可编辑的节点和连线。文件名是中心主题，标题与嵌套列表构成层级。只有普通段落时，用各段落生成一级主题。

也可以通过「从已有笔记生成」直接选择工作区的笔记。笔记标题成为中心主题。

空白画布可点击「插入示例导图」，用应用的项目结构试着调整节点和连线。

导图较大时，可用「搜索节点」输入文字后点选结果，也可用「显示全部节点」查看整张画布上的导图。

选中节点后点击「子节点」或按 Insert，可以添加一个已经连好的子节点并开始输入。同一工具条可切换节点的椭圆或长方形。

点「节点颜色」可选择配色，适合区分主题或标注重点。选择「默认」可恢复形状的初始颜色。

点击「自动整理导图」可按连线层级重新排列节点。如果想恢复之前的位置，可在下次修改导图前点「撤销整理」。

选中一条连线，再点「编辑连线」可写上关系名称。删除名称后只显示连线。

选中节点后可用方向键微调位置，按住 Shift 可加大移动步长。

思维导图菜单支持撤销和重做节点、连线、导入及整理操作。选择工具下也可使用 Ctrl+Z 和 Ctrl+Shift+Z。历史记录随当前画布页面维护。

## 代码怎么走

手动放置、编辑和连接使用 `mindMap.ts` 提供的操作。导入先调用 Markdown 文件导入能力，再由 `markdownMindMap.ts` 从正文提取层级并布局。生成的数据和手动创建的数据共用同一结构。

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `index.ts` | 画布和工作区 | 导出节点、连线类型和上层使用的函数。 |
| `createMindMapNode()`、`resizeMindMapNode()` | `CanvasView`、`MindMapLayer` | 用形状和坐标创建节点，或按指针位移计算新尺寸。 |
| `addMindMapChild()` | `CanvasView` | 接收父节点和两个新 ID，在父节点右侧找到空位，返回同时添加节点与连线的导图。 |
| `updateMindMapNode()`、`connectMindMapNodes()`、`removeMindMapElement()` | `CanvasView` | 更新节点、连接两个不同的节点，或删除节点及其连线。 |
| `mindMapEdgePoints()` | `MindMapLayer` | 根据两个节点的位置、形状和大小计算连线端点。 |
| `updateMindMapEdgeLabel()`、`mindMapEdgeLabel()` | `CanvasView`、`MindMapLayer`、PNG 导出 | 更新连线名称，或取得适合在画布显示的短文本。 |
| `mindMapBounds()` | `CanvasView` | 计算一组节点占用的画布范围，用于定位或显示全部节点。 |
| `mindMapNodeAppearance()`，`nodeAppearance.ts` | `MindMapLayer`、PNG 导出 | 根据形状和颜色选项，返回背景、边框及文字颜色。 |
| `organizeMindMap()`，`organizeMindMap.ts` | `CanvasView` | 按已有连线的方向和节点尺寸分列排列，返回更新过位置的导图。 |
| `createMarkdownMindMap()`，`markdownMindMap.ts` | `CanvasView` | 接收文件或已有笔记的标题与正文、起始坐标和 ID 生成函数，返回布局完成的导图。 |
| `createMindMapExample()`，`exampleMindMap.ts` | `CanvasView` | 返回供空白画布生成示例的标题与正文。 |
