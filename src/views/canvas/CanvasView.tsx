import { useEffect, useRef, useState } from "react";
import { FileUp, Hand, Layers, LayoutTemplate, Network, Plus } from "lucide-react";
import {
  addNoteCard, addStroke, addTextBox, moveCanvasItem, removeCanvasItem,
  undoLastStroke, updateNoteCard, updateTextBox,
} from "../../function/canvas-items";
import { copyDocumentContent } from "../../function/documents";
import type { Note } from "../../function/documents";
import { finishStroke } from "../../function/drawing";
import { importMarkdownFile } from "../../function/markdown-import";
import {
  addMindMapChild, connectMindMapNodes, createMarkdownMindMap, createMindMapExample, createMindMapNode, emptyMindMap, mindMapBounds, mindMapShapes,
  organizeMindMap, removeMindMapElement, updateMindMapEdgeLabel, updateMindMapNode,
} from "../../function/mind-map";
import type { MindMap, MindMapNode, MindMapShape } from "../../function/mind-map";
import { renderMindMapPng } from "../../function/mind-map-export";
import { fitViewport, panViewport, screenToCanvas, zoomViewport } from "../../function/viewport";
import type { CanvasViewport, Point } from "../../function/viewport";
import type { CanvasDocument } from "../../workspace/workspace";
import { CanvasToolbar, mindMapDragType } from "./CanvasToolbar";
import { CanvasItemsLayer } from "./CanvasItemsLayer";
import type { CanvasMenu, CanvasTool } from "./CanvasToolbar";
import { MindMapLayer, MindMapSelectionActions } from "./MindMapLayer";
import { MindMapOutline } from "./MindMapOutline";
import { pointerPosition, useCanvasGestures } from "./useCanvasGestures";
import { useMindMapHistory } from "./useMindMapHistory";
import type { MindMapSnapshot } from "./useMindMapHistory";
import "./canvas.css";

export interface CanvasViewProps {
  canvas: CanvasDocument;
  notes: readonly Note[];
  onChange: (canvas: CanvasDocument) => void;
  revealNode?: { nodeId: string };
}

type NoteContent = Pick<Note, "title" | "content">;

const toolKeys: Record<string, CanvasTool> = { v: "select", h: "hand", t: "text", b: "pen" };
const arrowSteps: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
};

function isEditorTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

function isMindMapShape(shape: string): shape is MindMapShape {
  return mindMapShapes.some((candidate) => candidate === shape);
}

function fitMapNodes(nodes: readonly MindMapNode[], area: HTMLElement, maximumScale = 1): CanvasViewport | null {
  const bounds = mindMapBounds(nodes);
  if (!bounds) return null;
  return panViewport(fitViewport(bounds, {
    width: Math.max(100, area.clientWidth - 76),
    height: Math.max(100, area.clientHeight - 144),
  }, maximumScale), { x: 0, y: -18 });
}

function isNodeInView(node: MindMapNode, viewport: CanvasViewport, area: HTMLElement): boolean {
  const { scale, offset } = viewport;
  const left = node.position.x * scale + offset.x + area.clientWidth / 2;
  const top = node.position.y * scale + offset.y + area.clientHeight / 2;
  return left >= 15 && top >= 55 && left + node.size.width * scale <= area.clientWidth - 15
    && top + node.size.height * scale <= area.clientHeight - 72;
}

export function CanvasView({ canvas, notes, onChange, revealNode }: CanvasViewProps) {
  const [tool, setTool] = useState<CanvasTool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<CanvasMenu>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [noteToPlace, setNoteToPlace] = useState<NoteContent | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [fileOverCanvas, setFileOverCanvas] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const lastReveal = useRef<typeof revealNode>(undefined);
  const markdownInput = useRef<HTMLInputElement>(null);
  const importTarget = useRef<"note" | "mind-map">("note");
  const importing = useRef(false);
  const exporting = useRef(false);
  const latest = useRef({ canvas, onChange });
  const history = useMindMapHistory();
  useEffect(() => { latest.current = { canvas, onChange }; }, [canvas, onChange]);
  const gestures = useCanvasGestures(canvas.viewport, (change) => {
    const { canvas, onChange } = latest.current;
    if (change.kind === "pan") {
      onChange({ ...canvas, viewport: change.viewport });
    } else if (change.kind === "draw") {
      const stroke = finishStroke(change.points);
      if (stroke) onChange({ ...canvas, items: addStroke(canvas.items, crypto.randomUUID(), stroke) });
    } else if (change.kind === "resize") {
      changeMindMap((map) => updateMindMapNode(map, change.id, { size: change.size }));
    } else if (change.target === "node") {
      changeMindMap((map) => updateMindMapNode(map, change.id, { position: change.position }));
    } else {
      onChange({ ...canvas, items: moveCanvasItem(canvas.items, change.id, change.position) });
    }
  });
  const { active: gesture, draft } = gestures;
  const viewport = draft?.kind === "pan" ? draft.viewport : canvas.viewport;
  const map = canvas.mindMap ?? emptyMindMap;
  const renderedMap = draft?.kind === "move" && draft.target === "node" ? updateMindMapNode(map, draft.id, { position: draft.position })
    : draft?.kind === "resize" ? updateMindMapNode(map, draft.id, { size: draft.size }) : map;

  useEffect(() => {
    if (!revealNode || lastReveal.current === revealNode || !stage.current) return;
    lastReveal.current = revealNode;
    const node = canvas.mindMap?.nodes.find((candidate) => candidate.id === revealNode.nodeId);
    if (!node) return;
    const viewport = fitMapNodes([node], stage.current, Math.max(.85, canvas.viewport.scale));
    if (!viewport) return;
    setTool("select");
    setMenu(null);
    setOutlineOpen(false);
    setLinkSource(null);
    setNoteToPlace(null);
    setEditing(null);
    setCanvasError(null);
    setSelected(node.id);
    onChange({ ...canvas, viewport });
  }, [canvas, onChange, revealNode]);

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
  }, [gesture]);

  function chooseTool(nextTool: CanvasTool) {
    setTool(nextTool);
    setNoteToPlace(null);
    setMenu(null);
    setLinkSource(null);
    setCanvasError(null);
    if (nextTool !== "select") {
      setEditing(null);
      setSelected(null);
    }
    stage.current?.focus({ preventScroll: true });
  }

  function removeObject(id: string) {
    if (map.nodes.some((node) => node.id === id) || map.edges.some((edge) => edge.id === id)) {
      changeMindMap((map) => removeMindMapElement(map, id));
    } else {
      onChange({ ...canvas, items: removeCanvasItem(canvas.items, id) });
    }
    setSelected(null);
    setEditing(null);
    stage.current?.focus({ preventScroll: true });
  }

  function changeMindMap(edit: (map: MindMap) => MindMap, options?: { focusId?: string; mergeKey?: string }) {
    const { canvas, onChange } = latest.current;
    const before = canvas.mindMap ?? emptyMindMap;
    const mindMap = edit(before);
    if (mindMap === before) return;
    const focus = options?.focusId && mindMap.nodes.find((node) => node.id === options.focusId);
    const viewport = focus && stage.current && !isNodeInView(focus, canvas.viewport, stage.current)
      ? fitMapNodes([focus], stage.current, Math.max(.85, canvas.viewport.scale)) : null;
    const next = { ...canvas, mindMap, viewport: viewport ?? canvas.viewport };
    history.record({ map: before, viewport: viewport ? canvas.viewport : undefined },
      { map: mindMap, viewport: viewport ?? undefined }, { mergeKey: options?.mergeKey });
    latest.current = { canvas: next, onChange };
    onChange(next);
  }

  function addChild(parent: MindMapNode) {
    const nodeId = crypto.randomUUID();
    const edgeId = crypto.randomUUID();
    changeMindMap((map) => addMindMapChild(map, parent, nodeId, edgeId), { focusId: nodeId });
    setSelected(nodeId);
    setEditing(nodeId);
  }

  function placeShape(shape: MindMapShape, position: Point) {
    const node = createMindMapNode(crypto.randomUUID(), shape, position);
    changeMindMap((map) => ({ ...map, nodes: [...map.nodes, node] }));
    chooseTool("select");
    setSelected(node.id);
    setEditing(null);
  }

  function startNodeEdit(id: string) {
    if (tool !== "select" || noteToPlace) return;
    setSelected(id);
    setEditing(id);
  }

  function placeGeneratedMap(note: NoteContent, area: HTMLElement) {
    const { canvas, onChange } = latest.current;
    const map = canvas.mindMap ?? emptyMindMap;
    let right = 0;
    for (const item of canvas.items) {
      if (item.kind === "stroke") {
        for (const point of item.points) right = Math.max(right, point.x + 3);
      } else {
        right = Math.max(right, item.position.x + (item.kind === "note-card" ? 378 : 228));
      }
    }
    for (const node of map.nodes) right = Math.max(right, node.position.x + node.size.width);
    const origin = { x: right + 92, y: 0 };
    const generated = createMarkdownMindMap(note, origin, () => crypto.randomUUID());
    const mindMap = { nodes: [...map.nodes, ...generated.nodes], edges: [...map.edges, ...generated.edges] };
    const viewport = fitMapNodes(generated.nodes, area) ?? canvas.viewport;
    history.record({ map, viewport: canvas.viewport }, { map: mindMap, viewport });
    onChange({ ...canvas, mindMap, viewport });
    setSelected(null);
    setEditing(null);
  }

  function showMapNodes(nodes: readonly MindMapNode[], focused?: MindMapNode) {
    if (!stage.current) return;
    const viewport = fitMapNodes(nodes, stage.current, focused ? Math.max(.85, canvas.viewport.scale) : 1);
    if (!viewport) return;
    chooseTool("select");
    setOutlineOpen(false);
    setEditing(null);
    setSelected(focused?.id ?? null);
    onChange({ ...canvas, viewport });
  }

  function arrangeMap() {
    if (!stage.current) return;
    const mindMap = organizeMindMap(map);
    if (mindMap === map) return;
    chooseTool("select");
    setSelected(null);
    setEditing(null);
    setOutlineOpen(false);
    const viewport = fitMapNodes(mindMap.nodes, stage.current) ?? canvas.viewport;
    history.record({ map, viewport: canvas.viewport }, { map: mindMap, viewport }, { action: "layout" });
    onChange({ ...canvas, mindMap, viewport });
  }

  function restoreMindMap(snapshot: MindMapSnapshot | undefined) {
    if (!snapshot) return;
    chooseTool("select");
    setSelected(null);
    setEditing(null);
    setOutlineOpen(false);
    const { canvas, onChange } = latest.current;
    onChange({ ...canvas, mindMap: snapshot.map, viewport: snapshot.viewport ?? canvas.viewport });
  }

  async function exportMindMap() {
    if (exporting.current) return;
    setMenu(null);
    setCanvasError(null);
    exporting.current = true;
    try {
      const image = await renderMindMapPng(map);
      if (!stage.current) return;
      const url = URL.createObjectURL(image);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${canvas.title.trim().replace(/[\\/:*?"<>|]/g, "_") || "未命名画布"}-思维导图.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      if (stage.current) setCanvasError(error instanceof Error ? error.message : "无法导出思维导图。");
    } finally {
      exporting.current = false;
    }
  }

  function placeNote(note: NoteContent, position: Point) {
    const { canvas, onChange } = latest.current;
    const id = crypto.randomUUID();
    onChange({ ...canvas, items: addNoteCard(canvas.items, id, position, note) });
    setSelected(id);
    setEditing(null);
  }

  async function importFile(file: File, position?: Point, target = importTarget.current) {
    if (importing.current) return;
    importing.current = true;
    setCanvasError(null);
    try {
      const note = await importMarkdownFile(file);
      if (!stage.current) return;
      chooseTool("select");
      if (target === "mind-map") placeGeneratedMap(note, stage.current);
      else if (position) placeNote(note, position);
      else setNoteToPlace(note);
    } catch (error) {
      if (stage.current) setCanvasError(error instanceof Error ? error.message : "无法导入 Markdown 文件。");
    } finally {
      importing.current = false;
    }
  }

  function changeZoom(scale: number) {
    onChange({ ...canvas, viewport: zoomViewport(canvas.viewport, { x: 0, y: 0 }, scale) });
  }

  const canUndo = canvas.items.some((item) => item.kind === "stroke");
  const offset = viewport.offset;
  const selectedNode = map.nodes.find((node) => node.id === selected);
  const selectedEdge = map.edges.find((edge) => edge.id === selected);

  return <section className="canvas-view" aria-label="画布页面">
    <div className="canvas-heading">
      <div className="canvas-heading-icon"><LayoutTemplate size={24} strokeWidth={1.65} /></div>
      <div className="canvas-heading-text">
        <h1>{canvas.title || "未命名画布"}</h1>
        <p>自由画布</p>
      </div>
      <div className="canvas-heading-meta"><Layers size={15} /><span>{canvas.items.length + map.nodes.length + map.edges.length} 个对象</span></div>
    </div>
    <div
      ref={stage} className={`canvas-stage tool-${noteToPlace ? "placing" : tool}${draft?.kind === "pan" ? " is-panning" : ""}`}
      aria-label="画布绘制区" tabIndex={0}
      style={{
        backgroundSize: `${Math.max(10, 20 * viewport.scale)}px ${Math.max(10, 20 * viewport.scale)}px`,
        backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (gestures.cancel()) {
            event.preventDefault();
            return;
          }
          if (outlineOpen) {
            setOutlineOpen(false);
            event.currentTarget.focus({ preventScroll: true });
            return;
          }
          setEditing(null);
          setSelected(null);
          setNoteToPlace(null);
          setMenu(null);
          if (isMindMapShape(tool) || tool === "connect") chooseTool("select");
          setCanvasError(null);
          return;
        }
        if (event.defaultPrevented || isEditorTarget(event.target) || event.altKey) return;
        if (event.ctrlKey || event.metaKey) {
          if (tool !== "select" || gesture.current) return;
          const key = event.key.toLowerCase();
          const redo = key === "y" || key === "z" && event.shiftKey;
          if (redo ? history.canRedo : key === "z" && history.canUndo) {
            event.preventDefault();
            restoreMindMap(redo ? history.redo() : history.undo());
          }
          return;
        }
        const offset = arrowSteps[event.key];
        if (offset && selectedNode && tool === "select" && !gesture.current) {
          event.preventDefault();
          const distance = event.shiftKey ? 12 : 1;
          const position = { x: selectedNode.position.x + offset.x * distance, y: selectedNode.position.y + offset.y * distance };
          changeMindMap((map) => updateMindMapNode(map, selectedNode.id, { position }), { mergeKey: `nudge:${selectedNode.id}` });
          return;
        }
        if (event.key === "Insert" && selectedNode && tool === "select") {
          event.preventDefault();
          addChild(selectedNode);
          return;
        }
        if (event.key === "Delete" && selected) removeObject(selected);
        const nextTool = toolKeys[event.key.toLowerCase()];
        if (nextTool) chooseTool(nextTool);
      }}
      onDragOver={(event) => {
        const draggingFiles = event.dataTransfer.types.includes("Files");
        if (!draggingFiles && !event.dataTransfer.types.includes(mindMapDragType)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (draggingFiles) setFileOverCanvas(true);
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setFileOverCanvas(false);
        }
      }}
      onDrop={(event) => {
        const shape = event.dataTransfer.getData(mindMapDragType);
        if (isMindMapShape(shape)) {
          event.preventDefault();
          const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
          placeShape(shape, screenToCanvas(point, canvas.viewport));
          return;
        }
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setFileOverCanvas(false);
        if (event.dataTransfer.files.length !== 1) {
          setCanvasError("请一次拖入一个 Markdown 文件。");
          return;
        }
        const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
        void importFile(event.dataTransfer.files[0], screenToCanvas(point, canvas.viewport), "note");
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
        const nodeId = event.target.closest<HTMLElement>("[data-map-node]")?.dataset.mapNode;
        const node = nodeId ? map.nodes.find((candidate) => candidate.id === nodeId) : undefined;
        const edgeId = event.target.closest("[data-map-edge]")?.getAttribute("data-map-edge");
        setMenu(null);

        if (wantsPan) {
          gestures.begin(event, { kind: "pan" });
        } else if (tool === "pen") {
          gestures.begin(event, { kind: "draw" });
        } else if (tool === "connect") {
          if (!node) return;
          if (linkSource && node.id !== linkSource) {
            const edge = { id: crypto.randomUUID(), from: linkSource, to: node.id };
            changeMindMap((map) => connectMindMapNodes(map, edge));
            setLinkSource(null);
          } else {
            setLinkSource(linkSource ? null : node.id);
          }
          event.currentTarget.focus({ preventScroll: true });
          return;
        } else if (isMindMapShape(tool)) {
          placeShape(tool, worldPoint);
          return;
        } else if (node && tool === "select" && !noteToPlace) {
          setSelected(node.id);
          if (editing !== node.id) setEditing(null);
          if (isEditorTarget(event.target)) return;
          gestures.begin(event, event.target.closest("[data-map-resize]")
            ? { kind: "resize", size: node.size, id: node.id }
            : { kind: "move", target: "node", position: node.position, id: node.id });
        } else if (edgeId && tool === "select" && !noteToPlace) {
          setSelected(edgeId);
          setEditing(null);
          event.currentTarget.focus({ preventScroll: true });
          return;
        } else if (object && item && tool === "select" && !noteToPlace) {
          setSelected(item.id);
          if (editing !== item.id) setEditing(null);
          if (item.kind === "stroke" || !event.target.closest("[data-drag-handle]") || isEditorTarget(event.target)
            || event.target.closest("button")) return;
          gestures.begin(event, { kind: "move", target: "object", position: item.position, id: item.id });
        } else if (object) {
          return;
        } else if (noteToPlace) {
          placeNote(noteToPlace, worldPoint);
          setNoteToPlace(null);
          setCanvasError(null);
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
        }
      }}
      onPointerMove={gestures.move}
      onPointerUp={gestures.finish}
      onPointerCancel={(event) => gestures.cancel(event.pointerId)}
      onLostPointerCapture={(event) => gestures.cancel(event.pointerId)}
      onPointerLeave={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) gestures.cancel(event.pointerId);
      }}
    >
      {canvas.items.length === 0 && map.nodes.length === 0 && !noteToPlace && tool === "select" && <div className="canvas-empty">
        <span className="empty-symbol"><LayoutTemplate size={27} strokeWidth={1.55} /></span>
        <h2>从空白开始</h2><p>添加笔记、放置文本，或随手画几笔。</p>
        <button className="secondary-button canvas-controls" type="button" onClick={() => {
          if (stage.current) placeGeneratedMap(createMindMapExample(), stage.current);
        }}>
          <Network size={15} /> 插入示例导图
        </button>
      </div>}
      <div className="canvas-world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${viewport.scale})` }}>
        <MindMapLayer map={renderedMap} selected={selected} editing={editing} linkSource={linkSource}
          onEdit={startNodeEdit} onResize={(id, size) => changeMindMap((map) => updateMindMapNode(map, id, { size }))}
          onFinishEdit={() => {
            setEditing(null);
            stage.current?.focus({ preventScroll: true });
          }} onTextChange={(id, text) => changeMindMap((map) => updateMindMapNode(map, id, { text }), { mergeKey: `text:${id}` })} />
        <CanvasItemsLayer items={canvas.items} selected={selected} editing={editing} allowDoubleClickEdit={tool === "select"}
          movePreview={draft?.kind === "move" && draft.target === "object" ? draft : undefined}
          strokePreview={draft?.kind === "draw" ? draft.points : undefined}
          onEdit={(id, active) => { setSelected(id); setEditing(active ? id : null); }}
          onRemove={removeObject}
          onNoteChange={(id, note) => onChange({ ...canvas, items: updateNoteCard(canvas.items, id, note) })}
          onTextChange={(id, text) => onChange({ ...canvas, items: updateTextBox(canvas.items, id, text) })} />
      </div>
      {noteToPlace && <div className="canvas-placement canvas-controls" role="status">
        <Plus size={16} /> 点击画布放置「{noteToPlace.title || "未命名笔记"}」
        <button className="text-button" type="button" onClick={() => setNoteToPlace(null)}>取消</button>
      </div>}
      {(isMindMapShape(tool) || tool === "connect") && <div className="canvas-placement canvas-controls">
        <span role="status">{tool === "connect" ? linkSource ? "选择要连接的第二个节点" : "选择要连接的第一个节点"
          : `点击画布放置${tool === "ellipse" ? "椭圆" : "长方形"}节点`}</span>
        <button className="text-button" type="button" onClick={() => chooseTool("select")}>完成</button>
      </div>}
      {tool === "select" && !noteToPlace && !canvasError && selected && (selectedNode || selectedEdge)
        && <MindMapSelectionActions key={selected} node={selectedNode} edge={selectedEdge} editing={editing === selected}
          onEdit={() => {
            if (editing === selected) { setEditing(null); stage.current?.focus({ preventScroll: true }); }
            else if (selectedEdge) setEditing(selected);
            else startNodeEdit(selected);
          }} onAddChild={() => { if (selectedNode) addChild(selectedNode); }}
          onChangeShape={() => {
            if (selectedNode) changeMindMap((map) => updateMindMapNode(map, selectedNode.id, {
              shape: selectedNode.shape === "ellipse" ? "rectangle" : "ellipse",
            }));
          }} onChooseTone={(tone) => {
            if (selectedNode) changeMindMap((map) => updateMindMapNode(map, selectedNode.id, { tone }));
          }} onEdgeLabelChange={(label) => changeMindMap((map) => updateMindMapEdgeLabel(map, selected, label), { mergeKey: `label:${selected}` })}
          onDelete={() => removeObject(selected)} />}
      {canvasError && !noteToPlace && <div className="canvas-placement canvas-controls canvas-error" role="alert">
        {canvasError}<button className="text-button" type="button" onClick={() => setCanvasError(null)}>关闭</button>
      </div>}
      {fileOverCanvas && <div className="canvas-file-drop" aria-hidden="true"><FileUp size={18} /> 松开以导入 Markdown</div>}
      {outlineOpen && <MindMapOutline nodes={map.nodes}
        onClose={() => {
          setOutlineOpen(false);
          stage.current?.focus({ preventScroll: true });
        }} onFocusNode={(node) => showMapNodes([node], node)} />}
      <input hidden ref={markdownInput} type="file" accept=".md,.markdown,text/markdown" aria-label="选择画布 Markdown 文件"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          input.value = "";
          if (file) void importFile(file);
        }} />
      <div className="canvas-hint"><Hand size={14} /> 中键拖动画布 <span>·</span> 滚轮缩放</div>
      <CanvasToolbar tool={tool} scale={viewport.scale} menu={menu} notes={notes}
        canUndo={canUndo} hasMindMap={map.nodes.length > 0} canArrangeMindMap={map.nodes.length > 1}
        undoMapLabel={history.canUndo ? history.lastAction === "layout" ? "撤销整理" : "撤销导图操作" : undefined}
        canRedoMap={history.canRedo} onChooseTool={chooseTool} onMenuChange={setMenu}
        onChooseNote={(note) => {
          chooseTool("select");
          setNoteToPlace({ title: note.title, content: copyDocumentContent(note.content) });
        }}
        onImportMarkdown={() => {
          chooseTool("select");
          importTarget.current = "note";
          markdownInput.current?.click();
        }}
        onImportMindMap={() => {
          chooseTool("select");
          importTarget.current = "mind-map";
          markdownInput.current?.click();
        }}
        onGenerateFromNote={(note) => {
          if (!stage.current) return;
          chooseTool("select");
          placeGeneratedMap(note, stage.current);
        }}
        onFitMindMap={() => showMapNodes(map.nodes)}
        onShowMindMapOutline={() => {
          setMenu(null);
          setOutlineOpen(true);
        }}
        onExportMindMap={() => { void exportMindMap(); }}
        onArrangeMindMap={arrangeMap}
        onUndoMap={() => restoreMindMap(history.undo())}
        onRedoMap={() => restoreMindMap(history.redo())}
        onUndo={() => onChange({ ...canvas, items: undoLastStroke(canvas.items) })}
        onZoom={changeZoom} />
    </div>
  </section>;
}
