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
  return <section className="note-view" aria-label={t("笔记页面")}>
    <div className="note-sheet">
      <div className="note-heading">
        <input aria-label={t("笔记标题")} className="note-title" value={note.title} placeholder={t("未命名笔记")}
          onChange={(event) => onChange({ ...note, title: event.currentTarget.value })} />
        {onTranslate && <button type="button" className="icon-button note-translate" title={t("翻译笔记")}
          aria-label={t("翻译笔记")} aria-haspopup="dialog" onClick={onTranslate}><Languages size={18} /></button>}
      </div>
      <RichTextEditor content={note.content} onChange={(content) => onChange({ ...note, content })} />
    </div>
  </section>;
}
