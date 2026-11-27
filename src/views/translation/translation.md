# 翻译弹窗

首次点击笔记标题旁的翻译图标，或选择「思维导图 → 翻译导图」，即可打开翻译弹窗。选定方向并点击「离线翻译」，成功后当前条目直接显示译文。之后在同一入口切换中英文，应用会显示保存的对应版本。翻译过程中关闭弹窗可以取消。

| 文件与入口 | 调用方 | 职责 |
| --- | --- | --- |
| `TranslationDialog({ source, engine, onApply, onClose })` | `App` | 接收笔记或画布的快照，选择翻译方向、显示进度，并交回结果。 |
| `onApply(result, direction)` | `TranslationDialog` | 检查原内容后把当前条目切到译文，同时保存原先的标题和正文或导图标签。 |
| `engine.translate(direction, segments)` | `function/note-translation` | 启动桌面进程中的离线推理。 |
| `engine.cancel()` | `TranslationDialog` | 在翻译过程中关闭弹窗时取消推理。 |
| `translation.css` | `TranslationDialog` | 设置弹窗和翻译操作区的布局。 |
