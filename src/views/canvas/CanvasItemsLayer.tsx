import { useTranslation } from "../../i18n";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { RichTextEditor } from "../../editor/RichTextEditor";
import type { CanvasItem, NoteCard } from "../../function/canvas-items";
import { annotationArrowPath } from "../../function/drawing";
import type { ArrowBend } from "../../function/drawing";
import type { Point } from "../../function/viewport";

interface CanvasItemsLayerProps {
  items: readonly CanvasItem[];
  selected: string | null;
  editing: string | null;
  allowDoubleClickEdit: boolean;
  movePreview?: { id: string; position: Point };
  strokePreview?: readonly Point[];
  arrowPreview?: { points: readonly [Point, Point]; bend: ArrowBend };
  onEdit: (id: string, editing: boolean) => void;
  onRemove: (id: string) => void;
  onNoteChange: (id: string, note: Pick<NoteCard, "title" | "content">) => void;
  onTextChange: (id: string, text: string) => void;
}

function Stroke({ points, draft = false }: { points: readonly Point[]; draft?: boolean }) {
  if (points.length === 1) return <circle cx={points[0].x} cy={points[0].y} r={1.6} />;
  return <polyline className={draft ? "draft-stroke" : undefined}
    points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />;
}

export function CanvasItemsLayer({
  items, selected, editing, allowDoubleClickEdit, movePreview, strokePreview, arrowPreview, onEdit, onRemove, onNoteChange, onTextChange,
}: CanvasItemsLayerProps) {
  const { t } = useTranslation();
  return <>
    {items.map((item) => {
      if (item.kind === "stroke") return null;
      const position = movePreview?.id === item.id ? movePreview.position : item.position;
      const isEditing = editing === item.id;
      const isSelected = selected === item.id;
      const isCard = item.kind === "note-card";
      const [firstLine, ...rest] = isCard ? [] : item.text.split("\n");

      return <article key={item.id} data-object-id={item.id}
        className={`canvas-object ${isCard ? "note-card" : "text-box"}${isSelected ? " is-selected" : ""}${isEditing ? " is-editing" : ""}`}
        style={{ left: position.x, top: position.y }}
        onDoubleClick={(event) => {
          if (allowDoubleClickEdit && event.target instanceof Element
            && !event.target.closest("button, a, input, textarea, .editor-toolbar")) onEdit(item.id, true);
        }}>
        <header className="object-header" data-drag-handle>
          <span className="object-kind-icon">{isCard ? <Layers size={15} /> : <span>T</span>}</span>
          {isCard && isEditing ? <input className="object-title-input" aria-label={t("卡片标题")} value={item.title}
            onChange={(event) => onNoteChange(item.id, { title: event.currentTarget.value, content: item.content })} />
            : <span className="object-label">{isCard ? item.title || t("未命名笔记") : t("文本框")}</span>}
          <div className="object-actions">
            <button type="button" className="icon-button" title={isEditing ? t("完成编辑") : t("编辑对象")}
              aria-label={isEditing ? t("完成编辑") : t("编辑对象")} onClick={() => onEdit(item.id, !isEditing)}><Pencil size={13} /></button>
            <button type="button" className="icon-button" title={t("删除对象")} aria-label={t("删除对象")} onClick={() => onRemove(item.id)}>
              <Trash2 size={13} />
            </button>
          </div>
        </header>
        {isCard ? <div className="object-body">
          <RichTextEditor editable={isEditing} content={item.content}
            onChange={(content) => onNoteChange(item.id, { title: item.title, content })} />
        </div> : isEditing ? <textarea className="object-text-input" aria-label={t("文本框内容")} placeholder={t("输入文本…")}
          value={item.text} rows={Math.max(3, rest.length + 1)} autoFocus
          onChange={(event) => onTextChange(item.id, event.currentTarget.value)} />
          : <div className="object-body text-preview">
            <strong>{firstLine || t("空白文本框")}</strong>
            {rest.length > 0 && <p>{rest.join("\n")}</p>}
          </div>}
      </article>;
    })}
    <svg className="canvas-strokes" aria-hidden="true">
      {items.map((item) => {
        if (item.kind !== "stroke") return null;
        if (item.style === "arrow" && item.points[1]) {
          return <path key={item.id} className="canvas-arrow" d={annotationArrowPath(item.points[0], item.points[1], item.bend)} />;
        }
        return <Stroke key={item.id} points={item.points} />;
      })}
      {strokePreview && <Stroke points={strokePreview} draft />}
      {arrowPreview && <path className="canvas-arrow draft-arrow" d={annotationArrowPath(...arrowPreview.points, arrowPreview.bend)} />}
    </svg>
  </>;
}
