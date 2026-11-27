import { ArrowLeft, BookOpen, Circle, Download, FileUp, Focus, Hand, Link2, List, Minus, MousePointer2, Network, PenLine, Plus, RectangleHorizontal, Redo2, Rows3, Type, Undo2 } from "lucide-react";
import type { Note } from "../../function/documents";
import type { MindMapShape } from "../../function/mind-map";
import { minimumCanvasScale } from "../../function/viewport";

export type CanvasTool = "select" | "hand" | "text" | "pen" | MindMapShape | "connect";
export const mindMapDragType = "application/x-inkbench-mind-map-shape";
export type CanvasMenu = "notes" | "mind-map" | "map-notes" | null;

interface CanvasToolbarProps {
  tool: CanvasTool;
  scale: number;
  notes: readonly Note[];
  menu: CanvasMenu;
  canUndo: boolean;
  hasMindMap: boolean;
  canArrangeMindMap: boolean;
  undoMapLabel?: string;
  canRedoMap: boolean;
  onChooseTool: (tool: CanvasTool) => void;
  onMenuChange: (menu: CanvasMenu) => void;
  onChooseNote: (note: Note) => void;
  onImportMarkdown: () => void;
  onImportMindMap: () => void;
  onGenerateFromNote: (note: Note) => void;
  onFitMindMap: () => void;
  onShowMindMapOutline: () => void;
  onExportMindMap: () => void;
  onArrangeMindMap: () => void;
  onUndoMap: () => void;
  onRedoMap: () => void;
  onUndo: () => void;
  onZoom: (scale: number) => void;
}

const tools = [
  { id: "select", label: "选择", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "平移", shortcut: "H", icon: Hand },
  { id: "text", label: "文本", shortcut: "T", icon: Type },
  { id: "pen", label: "画笔", shortcut: "B", icon: PenLine },
] as const;

const mapShapes = [
  { shape: "ellipse", label: "椭圆节点", icon: Circle },
  { shape: "rectangle", label: "长方形节点", icon: RectangleHorizontal },
] as const;

function NoteOptions({ notes, onChoose }: { notes: readonly Note[]; onChoose: (note: Note) => void }) {
  return notes.map((note) => (
    <button type="button" key={note.id} onClick={() => onChoose(note)}>
      <BookOpen size={15} /><span>{note.title || "未命名笔记"}</span>
    </button>
  ));
}

export function CanvasToolbar({
  tool, scale, notes, menu, canUndo, hasMindMap, canArrangeMindMap, undoMapLabel, canRedoMap, onChooseTool, onMenuChange, onChooseNote,
  onImportMarkdown, onImportMindMap, onGenerateFromNote, onFitMindMap, onShowMindMapOutline, onExportMindMap, onArrangeMindMap,
  onUndoMap, onRedoMap, onUndo, onZoom,
}: CanvasToolbarProps) {
  const mapMenuOpen = menu === "mind-map" || menu === "map-notes";
  return <>
    <div className="canvas-toolbar canvas-controls" role="group" aria-label="画布工具">
      {tools.map(({ id, label, shortcut, icon: Icon }) => <button key={id} type="button" className="canvas-tool"
        title={`${label}（${shortcut}）`} aria-label={label} aria-pressed={tool === id} onClick={() => onChooseTool(id)}>
        <Icon size={18} strokeWidth={1.8} />
      </button>)}
      <span className="canvas-tool-divider" />
      <div className="canvas-note-picker">
        <button type="button" className="canvas-tool note-picker-toggle" aria-expanded={menu === "notes"}
          onClick={() => onMenuChange(menu === "notes" ? null : "notes")}><BookOpen size={17} strokeWidth={1.8} /><span>添加笔记</span></button>
        {menu === "notes" && <div className="note-picker-menu" aria-label="选择笔记">
          <button type="button" onClick={onImportMarkdown}><FileUp size={15} /><span>导入 Markdown 到画布</span></button>
          <NoteOptions notes={notes} onChoose={onChooseNote} />
        </div>}
      </div>
      <div className="canvas-note-picker">
        <button type="button" className="canvas-tool note-picker-toggle map-menu-toggle" aria-label="思维导图" title="思维导图"
          aria-expanded={mapMenuOpen} data-active={tool === "connect" || tool === "ellipse" || tool === "rectangle"}
          onClick={() => onMenuChange(mapMenuOpen ? null : "mind-map")}>
          <Network size={17} strokeWidth={1.8} /><span>思维导图</span>
        </button>
        {menu === "mind-map" && <div className="note-picker-menu mind-map-menu" aria-label="思维导图工具">
          {mapShapes.map(({ shape, label, icon: Icon }) => (
            <button type="button" key={shape} draggable onClick={() => onChooseTool(shape)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData(mindMapDragType, shape);
              }}><Icon size={16} />{label}</button>
          ))}
          <button type="button" onClick={() => onChooseTool("connect")}><Link2 size={16} />连接节点</button>
          <button type="button" onClick={onImportMindMap}><FileUp size={16} />从 Markdown 生成</button>
          <button type="button" disabled={!notes.length} onClick={() => onMenuChange("map-notes")}><BookOpen size={16} />从已有笔记生成</button>
          <div className="mind-map-menu-divider" />
          <button type="button" disabled={!hasMindMap} onClick={onShowMindMapOutline}><List size={16} />搜索节点</button>
          <button type="button" disabled={!hasMindMap} onClick={onFitMindMap}><Focus size={16} />显示全部节点</button>
          <button type="button" disabled={!canArrangeMindMap} onClick={onArrangeMindMap}><Rows3 size={16} />自动整理导图</button>
          {undoMapLabel && <button type="button" onClick={onUndoMap} title="Ctrl+Z"><Undo2 size={16} />{undoMapLabel}</button>}
          {canRedoMap && <button type="button" onClick={onRedoMap} title="Ctrl+Shift+Z"><Redo2 size={16} />重做导图操作</button>}
          <button type="button" disabled={!hasMindMap} onClick={onExportMindMap}><Download size={16} />导出 PNG</button>
        </div>}
        {menu === "map-notes" && <div className="note-picker-menu" aria-label="选择生成导图的笔记">
          <button type="button" onClick={() => onMenuChange("mind-map")}><ArrowLeft size={15} />返回导图工具</button>
          <div className="mind-map-menu-divider" />
          <NoteOptions notes={notes} onChoose={onGenerateFromNote} />
        </div>}
      </div>
      <span className="canvas-tool-divider" />
      <button type="button" className="canvas-tool" title="撤销最近一笔" aria-label="撤销最近一笔" disabled={!canUndo}
        onClick={onUndo}><Undo2 size={18} strokeWidth={1.8} /></button>
    </div>
    <div className="canvas-zoom canvas-controls" role="group" aria-label="画布缩放">
      <button type="button" className="icon-button" aria-label="缩小" disabled={scale <= minimumCanvasScale} onClick={() => onZoom(scale / 1.2)}><Minus size={15} /></button>
      <button type="button" className="zoom-value" title="恢复 100% 缩放" onClick={() => onZoom(1)}>{scale < .01 ? "<1" : Math.round(scale * 100)}%</button>
      <button type="button" className="icon-button" aria-label="放大" disabled={scale >= 4} onClick={() => onZoom(scale * 1.2)}><Plus size={15} /></button>
    </div>
  </>;
}
