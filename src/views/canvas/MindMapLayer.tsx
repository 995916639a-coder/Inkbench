import { useTranslation } from "../../i18n";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Circle, Palette, Plus, RectangleHorizontal } from "lucide-react";
import { curvePath } from "../../function/drawing";
import { mindMapEdgeLabel, mindMapEdgeRoute, mindMapNodeAppearance, mindMapTones, resizeMindMapNode } from "../../function/mind-map";
import type { MindMap, MindMapEdge, MindMapNode, MindMapSize, MindMapTone } from "../../function/mind-map";
import "./mind-map.css";

interface MindMapLayerProps {
  map: MindMap;
  depthById: ReadonlyMap<string, number>;
  selected: string | null;
  editing: string | null;
  linkSource: string | null;
  onEdit: (id: string) => void;
  onResize: (id: string, size: MindMapSize) => void;
  onFinishEdit: () => void;
  onTextChange: (id: string, text: string) => void;
}

export function MindMapLayer({ map, depthById, selected, editing, linkSource, onEdit, onResize, onFinishEdit, onTextChange }: MindMapLayerProps) {
  const { t } = useTranslation();
  const nodes = new Map(map.nodes.map((node) => [node.id, node]));

  return <>
    {map.edges.length > 0 && <svg className="mind-map-edges" aria-hidden="true">
      {map.edges.map((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return null;
        const route = mindMapEdgeRoute(from, to, depthById.get(from.id));
        const d = curvePath(route);
        const { labelPoint } = route;
        const label = mindMapEdgeLabel(edge);
        return <g key={edge.id} className={selected === edge.id ? "is-selected" : undefined}>
          <path d={d} stroke={route.color} strokeWidth={route.width} className="mind-map-edge" />
          <path d={d} className="mind-map-edge-target" data-map-edge={edge.id} />
          {label && <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle"
            className="mind-map-edge-label" data-map-edge={edge.id}><title>{edge.label}</title>{label}</text>}
        </g>;
      })}
    </svg>}
    {map.nodes.map((node) => {
      const isEditing = editing === node.id;
      const isSelected = selected === node.id;
      const appearance = mindMapNodeAppearance(node);
      return <article key={node.id} data-map-node={node.id} data-shape={node.shape}
        className={`mind-map-node ${node.shape}${isSelected ? " is-selected" : ""}${linkSource === node.id ? " is-link-source" : ""}`}
        aria-label={node.text.trim() || t("空白节点")} tabIndex={0}
        style={{
          left: node.position.x, top: node.position.y, width: node.size.width, height: node.size.height,
          backgroundColor: appearance.fill, color: appearance.ink, "--mind-map-node-border": appearance.border,
        } as CSSProperties}
        onDoubleClick={(event) => {
          if (event.target instanceof Element && !event.target.closest("textarea, button")) onEdit(node.id);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || event.key !== "Enter") return;
          event.preventDefault();
          onEdit(node.id);
        }}>
        {isEditing
          ? <textarea aria-label={t("节点文字")} autoFocus value={node.text} placeholder={t("输入节点文字")}
              onChange={(event) => onTextChange(node.id, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  onFinishEdit();
                }
              }} />
          : <span className="mind-map-label" title={node.text}>{node.text || t("双击输入文字")}</span>}
        {isSelected && !isEditing && <button type="button" data-map-resize className="mind-map-resize"
          aria-label={t("调整节点大小")} title={t("拖动调整大小，也可使用方向键")} onKeyDown={(event) => {
            const deltas = { ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 },
              ArrowUp: { x: 0, y: -8 }, ArrowDown: { x: 0, y: 8 } };
            const delta = deltas[event.key as keyof typeof deltas];
            if (!delta) return;
            event.preventDefault();
            onResize(node.id, resizeMindMapNode(node.size, delta));
          }} />}
      </article>;
    })}
  </>;
}

interface MindMapSelectionActionsProps {
  node?: MindMapNode;
  edge?: MindMapEdge;
  editing: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onChangeShape: () => void;
  onChooseTone: (tone?: MindMapTone) => void;
  onEdgeLabelChange: (label: string) => void;
  onDelete: () => void;
}

export function MindMapSelectionActions({
  node, edge, editing, onEdit, onAddChild, onChangeShape, onChooseTone, onEdgeLabelChange, onDelete,
}: MindMapSelectionActionsProps) {
  const { t } = useTranslation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const Shape = node?.shape === "ellipse" ? RectangleHorizontal : Circle;
  const shapeLabel = node?.shape === "ellipse" ? t("改为长方形") : t("改为椭圆");
  return <div className="canvas-placement canvas-controls mind-map-selection" role="group" aria-label={t("导图编辑")}>
    {node && <>
      <button className="text-button" type="button" onClick={onEdit}>{editing ? t("完成编辑") : t("编辑节点")}</button>
      <button className="text-button" type="button" title={t("添加子节点（Insert）")} onClick={onAddChild}>
        <Plus size={14} />{t("子节点")}</button>
      <button className="icon-button" type="button" aria-label={shapeLabel} title={shapeLabel} onClick={onChangeShape}>
        <Shape size={14} />
      </button>
      <div className="mind-map-palette">
        <button className="icon-button" type="button" aria-label={t("节点颜色")} title={t("节点颜色")} aria-expanded={paletteOpen}
          onClick={() => setPaletteOpen(!paletteOpen)}><Palette size={15} /></button>
        {paletteOpen && <div className="mind-map-swatches" role="group" aria-label={t("选择节点颜色")}>
          {([undefined, ...Object.keys(mindMapTones)] as (MindMapTone | undefined)[]).map((tone) => {
            const appearance = mindMapNodeAppearance({ shape: node.shape, tone });
            const label = t(tone ? mindMapTones[tone].label : "默认");
            return <button className="mind-map-swatch" type="button" key={tone ?? "default"} aria-label={label}
              title={label} aria-pressed={node.tone === tone} style={{ background: appearance.fill, borderColor: appearance.border }}
              onClick={() => {
                onChooseTone(tone);
                setPaletteOpen(false);
              }} />;
          })}
        </div>}
      </div>
    </>}
    {edge && <>
      {editing && <input className="mind-map-edge-input" type="text" aria-label={t("连线名称")} placeholder={t("连线名称")} maxLength={64}
        value={edge.label ?? ""} autoFocus onChange={(event) => onEdgeLabelChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onEdit();
          }
        }} />}
      <button className="text-button" type="button" onClick={onEdit}>{editing ? t("完成编辑") : t("编辑连线")}</button>
    </>}
    <button className="text-button destructive-text" type="button" onClick={onDelete}>{node ? t("删除节点") : t("删除连线")}</button>
  </div>;
}
