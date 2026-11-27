# 笔记和导图翻译

在笔记标题旁点击翻译图标，或在画布中点「思维导图 → 翻译导图」。选择中英方向，点击「离线翻译」。检查译文后可保存副本。已安装的 Linux 桌面版可直接离线使用。

| 入口 | 调用方 | 输入与结果 |
| --- | --- | --- |
| `translateNote(note, direction, translate)` | `TranslationDialog` | 提取笔记标题和可翻译文本，调用引擎并重建带格式的译文。代码块、行内代码和链接地址保留。 |
| `translateMindMap(map, direction, translate)` | `TranslationDialog` | 翻译节点文字和连线标签，保留节点位置、大小、形状、配色和连接关系。 |
| `suggestedDirection(text)` 与 `documentLanguageSample(content)` | `TranslationDialog` | 从可翻译文字中选择默认方向，用户可手动切换。 |
| `TranslateText(direction, segments)` | 翻译能力 | 接收一批去重后的文本，按原顺序返回译文，由桌面桥接实现。 |

翻译能力在内存中构造译文，原笔记和原导图保持可编辑。工作台在用户确认后新建笔记，或复用 `duplicateCanvas()` 为画布副本和导图对象分配新 ID。导图翻译处理节点和连线标签，副本中的画布笔迹、文本框和卡片保留原内容。

桌面端通过 `translationService.ts` 管理 Electron 独立推理进程，`translationWorker.ts` 用 Transformers.js 与 ONNX Runtime 加载安装目录内的量化模型。进程按方向复用模型，关闭进行中的翻译窗口会取消当前推理。运行时使用本地模型目录并关闭远程加载。打包阶段会下载锁定版本的模型并核对 SHA-256。模型及许可随安装包交付。[模型说明](../../../docs/translation-model-notices.md)
