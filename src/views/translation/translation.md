# 翻译弹窗

笔记标题旁和思维导图菜单可以打开翻译弹窗。选定翻译方向后可预览格式化笔记，或对照导图标签的原文与译文。点「保存为副本」会打开新条目，关闭弹窗可以放弃结果。

| 文件与入口 | 调用方 | 职责 |
| --- | --- | --- |
| `TranslationDialog({ source, engine, onSave, onClose })` | `App` | 接收笔记或画布的快照，通过翻译能力生成预览，用户确认时将结果交回工作台。 |
| `engine.translate(direction, segments)` | `function/note-translation` | 启动桌面进程中的离线推理。 |
| `engine.cancel()` | `TranslationDialog` | 在翻译过程中关闭弹窗时取消推理。 |
| `translation.css` | `TranslationDialog` | 设置弹窗、操作区和预览区的布局。 |
