# 翻译弹窗

选择「思维导图 → 翻译导图」打开弹窗。选定方向并点击「离线翻译」，成功后当前导图直接显示译文。之后可在同一菜单切换已保存的中英文。翻译过程中关闭弹窗可以取消。

| 文件与入口 | 调用方 | 职责 |
| --- | --- | --- |
| `TranslationDialog({ map, engine, onApply, onClose })` | `App` | 接收导图快照，选择翻译方向、显示进度，并交回结果。 |
| `onApply(result, direction)` | `TranslationDialog` | 检查原导图后应用译文，并保存原先的节点文字和连线标签。 |
| `engine.translate(direction, segments)` | `function/mind-map-translation` | 启动桌面进程中的离线推理。 |
| `engine.cancel()` | `TranslationDialog` | 在翻译过程中关闭弹窗时取消推理。 |
| `translation.css` | `TranslationDialog` | 设置弹窗和翻译操作区的布局。 |
