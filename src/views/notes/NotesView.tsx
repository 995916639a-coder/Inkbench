import { Languages } from "lucide-react";
import type { Note } from "../../function/documents";
import { RichTextEditor } from "../../editor/RichTextEditor";
import { useTranslation } from "../../i18n";

export interface NotesViewProps {
  note: Note;
  onChange: (note: Note) => void;
  onTranslate?: () => void;
}

export function NotesView({ note, onChange, onTranslate }: NotesViewProps) {
  const { t } = useTranslation();
  const translationLabel = t(note.translation
    ? note.translation.language === "zh-CN" ? "切回英文" : "切回中文"
    : "翻译笔记");
  return <section className="note-view" aria-label={t("笔记页面")}>
    <div className="note-sheet">
      <div className="note-heading">
        <input aria-label={t("笔记标题")} className="note-title" value={note.title} placeholder={t("未命名笔记")}
          onChange={(event) => onChange({ ...note, title: event.currentTarget.value })} />
        {onTranslate && <button type="button" className="icon-button note-translate" title={translationLabel}
          aria-label={translationLabel} aria-haspopup={note.translation ? undefined : "dialog"} onClick={onTranslate}><Languages size={18} /></button>}
      </div>
      <RichTextEditor key={note.translation?.language ?? "original"} content={note.content}
        onChange={(content) => onChange({ ...note, content })} />
    </div>
  </section>;
}
