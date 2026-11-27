import type { Note } from "../../function/documents";
import { RichTextEditor } from "../../editor/RichTextEditor";

export interface NotesViewProps {
  note: Note;
  onChange: (note: Note) => void;
}

export function NotesView({ note, onChange }: NotesViewProps) {
  return <section className="note-view" aria-label="笔记页面">
    <div className="note-sheet">
      <input aria-label="笔记标题" className="note-title" value={note.title} placeholder="未命名笔记"
        onChange={(event) => onChange({ ...note, title: event.currentTarget.value })} />
      <RichTextEditor content={note.content} onChange={(content) => onChange({ ...note, content })} />
    </div>
  </section>;
}
