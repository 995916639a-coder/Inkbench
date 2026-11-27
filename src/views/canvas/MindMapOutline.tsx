import { useState } from "react";
import { Circle, RectangleHorizontal, Search, X } from "lucide-react";
import type { MindMapNode } from "../../function/mind-map";

interface MindMapOutlineProps {
  nodes: readonly MindMapNode[];
  onFocusNode: (node: MindMapNode) => void;
  onClose: () => void;
}

export function MindMapOutline({ nodes, onFocusNode, onClose }: MindMapOutlineProps) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matches = nodes.filter((node) => (node.text || "空白节点").toLowerCase().includes(search))
    .sort((left, right) => left.position.x - right.position.x || left.position.y - right.position.y);

  return <aside className="mind-map-outline canvas-controls" aria-label="导图节点列表">
    <header>
      <h2>导图节点</h2>
      <button type="button" className="icon-button" aria-label="关闭节点列表" onClick={onClose}><X size={15} /></button>
    </header>
    <form className="mind-map-search" onSubmit={(event) => {
      event.preventDefault();
      if (matches[0]) onFocusNode(matches[0]);
    }}>
      <Search size={15} aria-hidden="true" />
      <input type="search" aria-label="搜索节点" placeholder="搜索节点" value={query} autoFocus
        onChange={(event) => setQuery(event.currentTarget.value)} />
    </form>
    <div className="mind-map-outline-list">
      {matches.length === 0 ? <p role="status">没有找到节点</p> : matches.map((node) => {
        const Icon = node.shape === "ellipse" ? Circle : RectangleHorizontal;
        return <button key={node.id} type="button" title={node.text} onClick={() => onFocusNode(node)}>
          <Icon size={15} /><span>{node.text || "空白节点"}</span>
        </button>;
      })}
    </div>
  </aside>;
}
