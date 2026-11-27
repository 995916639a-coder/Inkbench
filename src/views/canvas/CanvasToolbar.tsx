import { BookOpen, FileUp, Hand, Minus, MousePointer2, PenLine, Plus, Type, Undo2 } from "lucide-react";
import type { Note } from "../../function/documents";

export type CanvasTool = "select" | "hand" | "text" | "pen";

interface CanvasToolbarProps {
  tool: CanvasTool;
  scale: number;
  notes: readonly Note[];
  notePickerOpen: boolean;
  canUndo: boolean;
  onChooseTool: (tool: CanvasTool) => void;
  onToggleNotes: () => void;
  onChooseNote: (note: Note) => void;
  onImportMarkdown: () => void;
  onUndo: () => void;
  onZoom: (scale: number) => void;
}

const tools = [
  { id: "select", label: "选择", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "平移", shortcut: "H", icon: Hand },
  { id: "text", label: "文本", shortcut: "T", icon: Type },
  { id: "pen", label: "画笔", shortcut: "B", icon: PenLine },
] as const;

export function CanvasToolbar({
  tool, scale, notes, notePickerOpen, canUndo, onChooseTool, onToggleNotes, onChooseNote, onImportMarkdown, onUndo, onZoom,
}: CanvasToolbarProps) {
  return <>
    <div className="canvas-toolbar canvas-controls" role="group" aria-label="画布工具">
      {tools.map(({ id, label, shortcut, icon: Icon }) => <button key={id} type="button" className="canvas-tool"
        title={`${label}（${shortcut}）`} aria-label={label} aria-pressed={tool === id} onClick={() => onChooseTool(id)}>
        <Icon size={18} strokeWidth={1.8} />
      </button>)}
      <span className="canvas-tool-divider" />
      <div className="canvas-note-picker">
        <button type="button" className="canvas-tool note-picker-toggle" aria-expanded={notePickerOpen}
          onClick={onToggleNotes}><BookOpen size={17} strokeWidth={1.8} /><span>添加笔记</span></button>
        {notePickerOpen && <div className="note-picker-menu" aria-label="选择笔记">
          <button type="button" onClick={onImportMarkdown}><FileUp size={15} /><span>导入 Markdown 到画布</span></button>
          {notes.map((note) => (
            <button type="button" key={note.id} onClick={() => onChooseNote(note)}>
              <BookOpen size={15} /><span>{note.title || "未命名笔记"}</span>
            </button>
          ))}
        </div>}
      </div>
      <span className="canvas-tool-divider" />
      <button type="button" className="canvas-tool" title="撤销最近一笔" aria-label="撤销最近一笔" disabled={!canUndo}
        onClick={onUndo}><Undo2 size={18} strokeWidth={1.8} /></button>
    </div>
    <div className="canvas-zoom canvas-controls" role="group" aria-label="画布缩放">
      <button type="button" className="icon-button" aria-label="缩小" disabled={scale <= 0.25} onClick={() => onZoom(scale / 1.2)}><Minus size={15} /></button>
      <button type="button" className="zoom-value" title="恢复 100% 缩放" onClick={() => onZoom(1)}>{Math.round(scale * 100)}%</button>
      <button type="button" className="icon-button" aria-label="放大" disabled={scale >= 4} onClick={() => onZoom(scale * 1.2)}><Plus size={15} /></button>
    </div>
  </>;
}
