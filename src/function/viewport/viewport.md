# 视口

画布页面在平移、缩放或需要确定放置位置时调用这里。对象位置以画布坐标保存。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 提供视口能力的对外入口。 |
| `viewport.ts` | 管理视口计算和坐标转换。 |

| 操作 | 调用方 | 输入 | 输出 |
| --- | --- | --- | --- |
| `screenToCanvas(point, viewport)` | `CanvasView` | 相对于显示区域中心的指针位置和当前视口 | 画布坐标 |
| `panViewport(viewport, delta)` | `CanvasView` | 当前视口和以像素计的平移量 | 偏移更新后的视口 |
| `zoomViewport(viewport, anchor, scale)` | `CanvasView` | 当前视口、区域内的缩放锚点和目标缩放倍数 | 保持锚点下方画布位置的更新视口 |
| `fitViewport(bounds, available, maximumScale?)` | `CanvasView` | 画布范围、可用区域尺寸和最大倍数 | 把范围居中并放入可用区域的视口 |
