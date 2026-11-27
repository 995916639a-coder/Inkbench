import type { Bounds, Point } from "../viewport";
import type { MindMapTone } from "./nodeAppearance";

export const mindMapShapes = ["ellipse", "rectangle"] as const;
export type MindMapShape = typeof mindMapShapes[number];
export type MindMapSize = { width: number; height: number };

export interface MindMapNode {
  id: string;
  shape: MindMapShape;
  text: string;
  position: Point;
  size: MindMapSize;
  tone?: MindMapTone;
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface MindMap {
  nodes: readonly MindMapNode[];
  edges: readonly MindMapEdge[];
}

export const emptyMindMap: MindMap = { nodes: [], edges: [] };

export function createMindMapNode(id: string, shape: MindMapShape, position: Point, text = ""): MindMapNode {
  return { id, shape, text, position, size: { width: 176, height: 74 } };
}

export function resizeMindMapNode(size: MindMapSize, delta: Point): MindMapSize {
  return { width: Math.max(88, size.width + delta.x), height: Math.max(48, size.height + delta.y) };
}

export function updateMindMapNode(map: MindMap, id: string, change: Partial<Pick<MindMapNode, "text" | "size" | "position" | "shape" | "tone">>): MindMap {
  return { ...map, nodes: map.nodes.map((node) => node.id === id ? { ...node, ...change } : node) };
}

export function addMindMapChild(map: MindMap, parent: MindMapNode, nodeId: string, edgeId: string): MindMap {
  const position = { x: parent.position.x + parent.size.width + 68, y: parent.position.y };
  const child = createMindMapNode(nodeId, "rectangle", position);
  const gap = 18;
  const column = map.nodes.filter((node) => position.x < node.position.x + node.size.width + gap
    && position.x + child.size.width + gap > node.position.x)
    .sort((left, right) => left.position.y - right.position.y);
  for (const node of column) {
    if (position.y + child.size.height + gap <= node.position.y) break;
    position.y = Math.max(position.y, node.position.y + node.size.height + gap);
  }
  return {
    nodes: [...map.nodes, child],
    edges: [...map.edges, { id: edgeId, from: parent.id, to: child.id }],
  };
}

export function connectMindMapNodes(map: MindMap, edge: MindMapEdge): MindMap {
  const { from, to } = edge;
  if (from === to || !map.nodes.some(({ id }) => id === from) || !map.nodes.some(({ id }) => id === to)
    || map.edges.some((line) => (line.from === from && line.to === to) || (line.from === to && line.to === from))) {
    return map;
  }
  return { ...map, edges: [...map.edges, edge] };
}

export function updateMindMapEdgeLabel(map: MindMap, id: string, label: string): MindMap {
  return { ...map, edges: map.edges.map((edge) => edge.id === id ? { ...edge, label: label || undefined } : edge) };
}

export function mindMapEdgeLabel(edge: MindMapEdge): string {
  const label = edge.label?.trim() ?? "";
  const characters = Array.from(label);
  return characters.length > 24 ? characters.slice(0, 23).join("") + "…" : label;
}

export function removeMindMapElement(map: MindMap, id: string): MindMap {
  return {
    nodes: map.nodes.filter((node) => node.id !== id),
    edges: map.edges.filter((edge) => edge.id !== id && edge.from !== id && edge.to !== id),
  };
}

function center(node: MindMapNode): Point {
  return { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 };
}

function border(node: MindMapNode, target: Point): Point {
  const origin = center(node);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const x = dx / (node.size.width / 2);
  const y = dy / (node.size.height / 2);
  const distance = node.shape === "ellipse" ? Math.hypot(x, y) : Math.max(Math.abs(x), Math.abs(y));
  return distance ? { x: origin.x + dx / distance, y: origin.y + dy / distance } : origin;
}

export function mindMapEdgePoints(from: MindMapNode, to: MindMapNode) {
  const start = border(from, center(to));
  const end = border(to, center(from));
  return { start, end, labelPoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 6 } };
}

export function mindMapBounds(nodes: readonly MindMapNode[]): Bounds | null {
  if (!nodes.length) return null;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const { position, size } of nodes) {
    left = Math.min(left, position.x);
    top = Math.min(top, position.y);
    right = Math.max(right, position.x + size.width);
    bottom = Math.max(bottom, position.y + size.height);
  }
  return { left, top, right, bottom };
}
