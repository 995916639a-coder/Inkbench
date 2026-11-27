import { useEffect, useRef, useState } from "react";
import { FileUp, Hand, Layers, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { RichTextEditor } from "../../editor/RichTextEditor";
import {
  addNoteCard, addStroke, addTextBox, moveCanvasItem, removeCanvasItem,
  undoLastStroke, updateNoteCard, updateTextBox,
} from "../../function/canvas-items";
import { copyDocumentContent } from "../../function/documents";
import type { Note } from "../../function/documents";
import { finishStroke } from "../../function/drawing";
import { importMarkdownFile } from "../../function/markdown-import";
import { panViewport, screenToCanvas, zoomViewport } from "../../function/viewport";
import type { CanvasViewport, Point } from "../../function/viewport";
import type { CanvasDocument } from "../../workspace/workspace";
import { CanvasToolbar } from "./CanvasToolbar";
import type { CanvasTool } from "./CanvasToolbar";
import "./canvas.css";

export interface CanvasViewProps {
  canvas: CanvasDocument;
  notes: readonly Note[];
  onChange: (canvas: CanvasDocument) => void;
}

type NoteContent = Pick<Note, "title" | "content">;

type Gesture =
  | { kind: "pan"; pointer: number; from: Point; viewport: CanvasViewport }
  | { kind: "draw"; pointer: number; points: Point[] }
  | { kind: "move"; pointer: number; id: string; from: Point; position: Point };

type Draft =
  | { kind: "pan"; viewport: CanvasViewport }
  | { kind: "draw"; points: readonly Point[] }
  | { kind: "move"; id: string; position: Point };

const toolKeys: Record<string, CanvasTool> = { v: "select", h: "hand", t: "text", b: "pen" };

function pointerPosition(stage: HTMLElement, clientX: number, clientY: number): Point {
  const rect = stage.getBoundingClientRect();
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
}

function isEditorTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

function movedPosition(position: Point, delta: Point, scale: number): Point {
  return { x: position.x + delta.x / scale, y: position.y + delta.y / scale };
}

function Stroke({ points, draft = false }: { points: readonly Point[]; draft?: boolean }) {
  if (points.length === 1) return <circle cx={points[0].x} cy={points[0].y} r={1.6} />;
  return <polyline className={draft ? "draft-stroke" : undefined}
    points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />;
}

export function CanvasView({ canvas, notes, onChange }: CanvasViewProps) {
  const [tool, setTool] = useState<CanvasTool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [noteToPlace, setNoteToPlace] = useState<NoteContent | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [fileOverCanvas, setFileOverCanvas] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const markdownInput = useRef<HTMLInputElement>(null);
  const importing = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef({ canvas, onChange });
  useEffect(() => { latest.current = { canvas, onChange }; }, [canvas, onChange]);
  const viewport = draft?.kind === "pan" ? draft.viewport : canvas.viewport;

  useEffect(() => {
    const area = stage.current;
    if (!area) return;

    function wheel(event: WheelEvent) {
      if (!area || gesture.current || !(event.target instanceof Element)) return;
      if (event.target.closest(".canvas-object, .canvas-controls")) return;
      event.preventDefault();
      const { canvas, onChange } = latest.current;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 350 : 1);
      const speed = event.ctrlKey ? 0.011 : 0.0018;
      const anchor = pointerPosition(area, event.clientX, event.clientY);
      const viewport = zoomViewport(canvas.viewport, anchor, canvas.viewport.scale * Math.exp(-delta * speed));
      latest.current = { canvas: { ...canvas, viewport }, onChange };
      onChange({ ...canvas, viewport });
    }

    area.addEventListener("wheel", wheel, { passive: false });
    return () => area.removeEventListener("wheel", wheel);
  }, []);

  function chooseTool(nextTool: CanvasTool) {
    setTool(nextTool);
    setNoteToPlace(null);
    setNotePickerOpen(false);
    setImportError(null);
    if (nextTool !== "select") {
      setEditing(null);
      setSelected(null);
    }
    stage.current?.focus({ preventScroll: true });
  }

  function removeObject(id: string) {
    onChange({ ...canvas, items: removeCanvasItem(canvas.items, id) });
    setSelected(null);
    setEditing(null);
    stage.current?.focus({ preventScroll: true });
  }

  function placeNote(note: NoteContent, position: Point) {
    const { canvas, onChange } = latest.current;
    const id = crypto.randomUUID();
    onChange({ ...canvas, items: addNoteCard(canvas.items, id, position, note) });
    setSelected(id);
    setEditing(null);
  }

  async function importFile(file: File, position?: Point) {
    if (importing.current) return;
    importing.current = true;
    setImportError(null);
    try {
      const note = await importMarkdownFile(file);
      if (!stage.current) return;
      chooseTool("select");
      if (position) placeNote(note, position);
      else setNoteToPlace(note);
    } catch (error) {
      if (stage.current) setImportError(error instanceof Error ? error.message : "无法导入 Markdown 文件。");
    } finally {
      importing.current = false;
    }
  }

  function changeZoom(scale: number) {
    onChange({ ...canvas, viewport: zoomViewport(canvas.viewport, { x: 0, y: 0 }, scale) });
  }

  function finishGesture(pointer: number, canceled = false, point?: Point) {
    const current = gesture.current;
    if (!current || current.pointer !== pointer) return;
    gesture.current = null;
    setDraft(null);
    if (canceled || !point) return;

    if (current.kind === "draw") {
      const stroke = finishStroke([...current.points, screenToCanvas(point, canvas.viewport)]);
      if (stroke) onChange({ ...canvas, items: addStroke(canvas.items, crypto.randomUUID(), stroke) });
      return;
    }

    const delta = { x: point.x - current.from.x, y: point.y - current.from.y };
    if (!delta.x && !delta.y) return;
    if (current.kind === "pan") {
      onChange({ ...canvas, viewport: panViewport(current.viewport, delta) });
    } else {
      const position = movedPosition(current.position, delta, canvas.viewport.scale);
      onChange({ ...canvas, items: moveCanvasItem(canvas.items, current.id, position) });
    }
  }

  const canUndo = canvas.items.some((item) => item.kind === "stroke");
  const offset = viewport.offset;

  return <section className="canvas-view" aria-label="画布页面">
    <div className="canvas-heading">
      <div className="canvas-heading-icon"><LayoutTemplate size={24} strokeWidth={1.65} /></div>
      <div className="canvas-heading-text">
        <h1>{canvas.title || "未命名画布"}</h1>
        <p>自由画布</p>
      </div>
      <div className="canvas-heading-meta"><Layers size={15} /><span>{canvas.items.length} 个对象</span></div>
    </div>
    <div
      ref={stage} className={`canvas-stage tool-${noteToPlace ? "placing" : tool}${draft?.kind === "pan" ? " is-panning" : ""}`}
      aria-label="画布绘制区" tabIndex={0}
      style={{
        backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
        backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setEditing(null);
          setSelected(null);
          setNoteToPlace(null);
          setNotePickerOpen(false);
          setImportError(null);
          return;
        }
        if (isEditorTarget(event.target) || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.key === "Delete" && selected) removeObject(selected);
        const nextTool = toolKeys[event.key.toLowerCase()];
        if (nextTool) chooseTool(nextTool);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setFileOverCanvas(true);
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setFileOverCanvas(false);
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setFileOverCanvas(false);
        if (event.dataTransfer.files.length !== 1) {
          setImportError("请一次拖入一个 Markdown 文件。");
          return;
        }
        const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
        void importFile(event.dataTransfer.files[0], screenToCanvas(point, canvas.viewport));
      }}
      onPointerDown={(event) => {
        if (gesture.current || !(event.target instanceof Element) || event.target.closest(".canvas-controls")) return;
        const wantsPan = event.button === 1 || (tool === "hand" && event.button === 0);
        if (event.button !== 0 && !wantsPan) return;
        const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
        const worldPoint = screenToCanvas(point, canvas.viewport);
        const object = event.target.closest<HTMLElement>(".canvas-object");
        const id = object?.dataset.objectId;
        const item = id ? canvas.items.find((candidate) => candidate.id === id) : undefined;
        setNotePickerOpen(false);

        if (wantsPan) {
          gesture.current = { kind: "pan", from: point, viewport: canvas.viewport, pointer: event.pointerId };
          setDraft({ kind: "pan", viewport: canvas.viewport });
        } else if (tool === "pen") {
          gesture.current = { kind: "draw", points: [worldPoint], pointer: event.pointerId };
          setDraft({ kind: "draw", points: [worldPoint] });
        } else if (object && item && tool === "select" && !noteToPlace) {
          setSelected(item.id);
          if (editing !== item.id) setEditing(null);
          if (item.kind === "stroke" || !event.target.closest("[data-drag-handle]") || isEditorTarget(event.target)
            || event.target.closest("button")) return;
          gesture.current = { kind: "move", from: point, position: item.position, id: item.id, pointer: event.pointerId };
        } else if (object) {
          return;
        } else if (noteToPlace) {
          placeNote(noteToPlace, worldPoint);
          setNoteToPlace(null);
          setImportError(null);
          stage.current?.focus({ preventScroll: true });
          return;
        } else if (tool === "text") {
          const id = crypto.randomUUID();
          onChange({ ...canvas, items: addTextBox(canvas.items, id, worldPoint) });
          setTool("select");
          setSelected(id);
          setEditing(id);
          return;
        } else {
          setSelected(null);
          setEditing(null);
          return;
        }

        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current || current.pointer !== event.pointerId) return;
        const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
        if (current.kind === "draw") {
          current.points.push(screenToCanvas(point, canvas.viewport));
          setDraft({ kind: "draw", points: [...current.points] });
          return;
        }
        const delta = { x: point.x - current.from.x, y: point.y - current.from.y };
        if (current.kind === "pan") {
          setDraft({ kind: "pan", viewport: panViewport(current.viewport, delta) });
        } else {
          const position = movedPosition(current.position, delta, canvas.viewport.scale);
          setDraft({ kind: "move", id: current.id, position });
        }
      }}
      onPointerUp={(event) => finishGesture(event.pointerId, false,
        pointerPosition(event.currentTarget, event.clientX, event.clientY))}
      onPointerCancel={(event) => finishGesture(event.pointerId, true)}
      onLostPointerCapture={(event) => finishGesture(event.pointerId, true)}
    >
      {canvas.items.length === 0 && !noteToPlace && tool === "select" && <div className="canvas-empty">
        <span className="empty-symbol"><LayoutTemplate size={27} strokeWidth={1.55} /></span>
        <h2>从空白开始</h2><p>添加笔记、放置文本，或随手画几笔。</p>
      </div>}
      <div className="canvas-world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${viewport.scale})` }}>
        {canvas.items.map((item) => {
          if (item.kind === "stroke") return null;
          const position = draft?.kind === "move" && draft.id === item.id ? draft.position : item.position;
          const isEditing = editing === item.id;
          const isSelected = selected === item.id;
          const isCard = item.kind === "note-card";
          const [firstLine, ...rest] = !isCard ? item.text.split("\n") : [];

          return <article key={item.id} data-object-id={item.id}
            className={`canvas-object ${isCard ? "note-card" : "text-box"}${isSelected ? " is-selected" : ""}${isEditing ? " is-editing" : ""}`}
            style={{ left: position.x, top: position.y }}
            onDoubleClick={(event) => {
              if (tool === "select" && event.target instanceof Element && !event.target.closest("button, a, input, textarea, .editor-toolbar")) {
                setSelected(item.id);
                setEditing(item.id);
              }
            }}>
            <header className="object-header" data-drag-handle>
              <span className="object-kind-icon">{isCard ? <Layers size={15} /> : <span>T</span>}</span>
              {isCard && isEditing ? <input className="object-title-input" aria-label="卡片标题" value={item.title}
                onChange={(event) => onChange({
                  ...canvas, items: updateNoteCard(canvas.items, item.id, { title: event.currentTarget.value, content: item.content }),
                })} />
                : <span className="object-label">{isCard ? item.title || "未命名笔记" : "文本框"}</span>}
              <div className="object-actions">
                <button type="button" className="icon-button" title={isEditing ? "完成编辑" : "编辑对象"}
                  aria-label={isEditing ? "完成编辑" : "编辑对象"} onClick={() => {
                    setSelected(item.id);
                    setEditing(isEditing ? null : item.id);
                  }}><Pencil size={13} /></button>
                <button type="button" className="icon-button" title="删除对象" aria-label="删除对象" onClick={() => removeObject(item.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </header>
            {isCard ? <div className="object-body">
              <RichTextEditor editable={isEditing} content={item.content}
                onChange={(content) => onChange({ ...canvas, items: updateNoteCard(canvas.items, item.id, { title: item.title, content }) })} />
            </div> : isEditing ? <textarea className="object-text-input" aria-label="文本框内容" placeholder="输入文本…"
              value={item.text} rows={Math.max(3, item.text.split("\n").length)} autoFocus
              onChange={(event) => onChange({ ...canvas, items: updateTextBox(canvas.items, item.id, event.currentTarget.value) })} />
              : <div className="object-body text-preview">
                <strong>{firstLine || "空白文本框"}</strong>
                {rest.length > 0 && <p>{rest.join("\n")}</p>}
              </div>}
          </article>;
        })}
        <svg className="canvas-strokes" aria-hidden="true">
          {canvas.items.map((item) => item.kind === "stroke" && <Stroke key={item.id} points={item.points} />)}
          {draft?.kind === "draw" && <Stroke points={draft.points} draft />}
        </svg>
      </div>
      {noteToPlace && <div className="canvas-placement canvas-controls" role="status">
        <Plus size={16} /> 点击画布放置「{noteToPlace.title || "未命名笔记"}」
        <button className="text-button" type="button" onClick={() => setNoteToPlace(null)}>取消</button>
      </div>}
      {importError && !noteToPlace && <div className="canvas-placement canvas-controls canvas-import-error" role="alert">
        {importError}<button className="text-button" type="button" onClick={() => setImportError(null)}>关闭</button>
      </div>}
      {fileOverCanvas && <div className="canvas-file-drop" aria-hidden="true"><FileUp size={18} /> 松开以导入 Markdown</div>}
      <input hidden ref={markdownInput} type="file" accept=".md,.markdown,text/markdown" aria-label="选择画布 Markdown 文件"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          input.value = "";
          if (file) void importFile(file);
        }} />
      <div className="canvas-hint"><Hand size={14} /> 中键拖动画布 <span>·</span> 滚轮缩放</div>
      <CanvasToolbar tool={tool} scale={viewport.scale} notePickerOpen={notePickerOpen} notes={notes}
        canUndo={canUndo} onChooseTool={chooseTool} onToggleNotes={() => setNotePickerOpen(!notePickerOpen)}
        onChooseNote={(note) => {
          chooseTool("select");
          setNoteToPlace({ title: note.title, content: copyDocumentContent(note.content) });
        }}
        onImportMarkdown={() => {
          chooseTool("select");
          markdownInput.current?.click();
        }}
        onUndo={() => onChange({ ...canvas, items: undoLastStroke(canvas.items) })}
        onZoom={changeZoom} />
    </div>
  </section>;
}
