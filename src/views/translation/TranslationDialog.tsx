import { useEffect, useRef, useState } from "react";
import { Languages, X } from "lucide-react";
import { RichTextEditor } from "../../editor/RichTextEditor";
import type { Note } from "../../function/documents";
import {
  documentLanguageSample, isTranslationDirection, suggestedDirection, translateMindMap, translateNote,
} from "../../function/note-translation";
import type { TranslationDirection } from "../../function/note-translation";
import { useTranslation } from "../../i18n";
import type { DesktopTranslation } from "../../workspace/desktopWorkspace";
import type { CanvasDocument } from "../../workspace/workspace";
import "./translation.css";

export type TranslationSource = { kind: "note"; note: Pick<Note, "title" | "content"> }
  | { kind: "canvas"; canvas: CanvasDocument };

interface TranslationDialogProps {
  source: TranslationSource;
  engine: DesktopTranslation;
  onSave: (result: TranslationSource, direction: TranslationDirection) => void;
  onClose: () => void;
}

export function TranslationDialog({ source, engine, onSave, onClose }: TranslationDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TranslationSource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [direction, setDirection] = useState(() => suggestedDirection(source.kind === "note"
    ? documentLanguageSample(source.note.content) || source.note.title
    : source.canvas.mindMap?.nodes.map((node) => node.text).join(" ") ?? ""));

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function start() {
    if (running.current) return;
    running.current = true;
    setMessage(null);
    setResult(null);
    setBusy(true);
    try {
      if (source.kind === "note") {
        const note = await translateNote(source.note, direction, engine.translate);
        if (note && running.current) setResult({ kind: "note", note });
        else if (running.current) setMessage("没有找到当前方向可翻译的文字。");
      } else if (source.canvas.mindMap) {
        const map = await translateMindMap(source.canvas.mindMap, direction, engine.translate);
        if (map && running.current) setResult({ kind: "canvas", canvas: { ...source.canvas, mindMap: map } });
        else if (running.current) setMessage("没有找到当前方向可翻译的文字。");
      }
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
      <h1 id="translation-title"><Languages size={19} />{t(source.kind === "note" ? "翻译笔记" : "翻译导图")}</h1>
      <button type="button" className="icon-button" aria-label={t("关闭翻译")} onClick={() => dialog.current?.close()}><X size={17} /></button>
    </header>
    <div className="translation-body">
      <div className="translation-actions">
        <label>{t("翻译方向")}
          <select value={direction} autoFocus disabled={busy} onChange={(event) => {
            const next = event.currentTarget.value;
            if (!isTranslationDirection(next)) return;
            setDirection(next);
            setResult(null);
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
      {result?.kind === "note" && <section className="translation-preview" aria-label={t("译文")} lang={direction === "zh-en" ? "en" : "zh-CN"}>
        {result.note.title && <h2>{result.note.title}</h2>}
        <RichTextEditor content={result.note.content} editable={false} />
      </section>}
      {result?.kind === "canvas" && source.kind === "canvas" && <section className="translation-preview" aria-label={t("译文")}>
        <TranslationLabels
          original={[...(source.canvas.mindMap?.nodes.map(({ text }) => text) ?? []), ...(source.canvas.mindMap?.edges.map(({ label }) => label ?? "") ?? [])]}
          translated={[...(result.canvas.mindMap?.nodes.map(({ text }) => text) ?? []), ...(result.canvas.mindMap?.edges.map(({ label }) => label ?? "") ?? [])]}
        />
      </section>}
    </div>
    {result && <footer className="translation-footer">
      <button type="button" className="primary-button" onClick={() => onSave(result, direction)}>{t("保存为副本")}</button>
    </footer>}
  </dialog>;
}

function TranslationLabels({ original, translated }: { original: string[]; translated: string[] }) {
  const { t } = useTranslation();
  return <table className="translation-labels">
    <thead><tr><th scope="col">{t("原文")}</th><th scope="col">{t("译文")}</th></tr></thead>
    <tbody>{original.map((label, index) => label.trim() && <tr key={index}><td>{label}</td><td>{translated[index]}</td></tr>)}</tbody>
  </table>;
}
