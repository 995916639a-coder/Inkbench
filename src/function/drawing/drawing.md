# 绘制

使用画笔时，画布页面收集指针经过的画布坐标。绘制结束后调用这里取得一笔轨迹，再交给画布对象模块提交。

选择「箭头标注」后从起点拖到终点，可画出带开放尖端的弧线箭头。箭头和自由笔迹都可以通过「撤销最近一笔」移除。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 提供绘制能力的对外入口。 |
| `drawing.ts` | 处理单次绘制轨迹。 |
| `curves.ts` | 把曲线和标注箭头变成 SVG 路径。 |

| 操作 | 调用方 | 输入 | 输出 |
| --- | --- | --- | --- |
| `finishStroke(points)` | `CanvasView` | 一次绘制收集的画布坐标序列 | 至少含一个点的 `StrokePath`，空轨迹返回 `null` |
| `annotationArrowPath(start, end)` | `CanvasItemsLayer` | 标注的起点和终点 | 带开放尖端的曲线箭头 |
| `curvePath(curve)` | `MindMapLayer` | 曲线的端点和控制点 | 用于显示或点选的曲线路径 |
