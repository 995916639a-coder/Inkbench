import { Languages } from "lucide-react";
import { switchSavedNoteLanguage } from "../../function/documents";
import type { Note } from "../../function/documents";
import { RichTextEditor } from "../../editor/RichTextEditor";
import { useTranslation } from "../../i18n";

export interface NotesViewProps {
  note: Note;
  onChange: (note: Note) => void;
}

export function NotesView({ note, onChange }: NotesViewProps) {
  const { t } = useTranslation();
  const languageLabel = t(note.translation?.language === "zh-CN" ? "切回英文" : "切回中文");
  return <section className="note-view" aria-label={t("笔记页面")}>
    <div className="note-sheet">
      <div className="note-heading">
        <input aria-label={t("笔记标题")} className="note-title" value={note.title} placeholder={t("未命名笔记")}
          onChange={(event) => onChange({ ...note, title: event.currentTarget.value })} />
        {note.translation && <button type="button" className="icon-button note-translate" title={languageLabel}
          aria-label={languageLabel} onClick={() => onChange(switchSavedNoteLanguage(note))}><Languages size={18} /></button>}
      </div>
      <RichTextEditor key={note.translation?.language ?? "original"} content={note.content}
        onChange={(content) => onChange({ ...note, content })} />
    </div>
  </section>;
}
