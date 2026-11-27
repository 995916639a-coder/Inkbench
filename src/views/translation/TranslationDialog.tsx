import { useEffect, useRef, useState } from "react";
import { Languages, X } from "lucide-react";
import type { MindMap } from "../../function/mind-map";
import { isTranslationDirection, suggestedDirection, translateMindMap } from "../../function/mind-map-translation";
import type { TranslationDirection } from "../../function/mind-map-translation";
import { useTranslation } from "../../i18n";
import type { DesktopTranslation } from "../../workspace/desktopWorkspace";
import "./translation.css";

interface TranslationDialogProps {
  map: MindMap;
  engine: DesktopTranslation;
  onApply: (result: MindMap, direction: TranslationDirection) => boolean;
  onClose: () => void;
}

export function TranslationDialog({ map, engine, onApply, onClose }: TranslationDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [direction, setDirection] = useState(() => suggestedDirection(map.nodes.map((node) => node.text).join(" ")));

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function start() {
    if (running.current) return;
    running.current = true;
    setMessage(null);
    setBusy(true);
    try {
      const result = await translateMindMap(map, direction, engine.translate);
      if (!running.current) return;
      if (!result) setMessage("没有找到当前方向可翻译的文字。");
      else if (!onApply(result, direction)) setMessage("原内容已变更。请关闭后重新翻译。");
    } catch {
      if (running.current) setMessage("无法完成离线翻译，请重试。");
    } finally {
      if (running.current) setBusy(false);
      running.current = false;
    }
  }

  function close() {
    if (running.current) {
      running.current = false;
      void engine.cancel().catch(() => {});
    }
    onClose();
  }

  return <dialog ref={dialog} className="translation-dialog" aria-labelledby="translation-title" onClose={close}>
    <header className="translation-header">
      <h1 id="translation-title"><Languages size={19} />{t("翻译导图")}</h1>
      <button type="button" className="icon-button" aria-label={t("关闭翻译")} onClick={() => dialog.current?.close()}><X size={17} /></button>
    </header>
    <div className="translation-body">
      <div className="translation-actions">
        <label>{t("翻译方向")}
          <select value={direction} autoFocus disabled={busy} onChange={(event) => {
            const next = event.currentTarget.value;
            if (!isTranslationDirection(next)) return;
            setDirection(next);
            setMessage(null);
          }}>
            <option value="en-zh">{t("英文 → 中文")}</option>
            <option value="zh-en">{t("中文 → 英文")}</option>
          </select>
        </label>
        <button type="button" className="primary-button" disabled={busy} onClick={() => void start()}>{t("离线翻译")}</button>
      </div>
      {busy && <p role="status" className="translation-status">{t("正在本机翻译…")}</p>}
      {message && <p role="status" className="translation-status">{t(message)}</p>}
    </div>
  </dialog>;
}
