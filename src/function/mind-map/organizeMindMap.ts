import { mindMapBounds } from "./mindMap";
import type { MindMap, MindMapNode } from "./mindMap";
import type { Point } from "../viewport";

const columnGap = 68;
const rowGap = 30;

export function organizeMindMap(map: MindMap): MindMap {
  const bounds = mindMapBounds(map.nodes);
  if (!bounds || map.nodes.length < 2) return map;

  const ordered = [...map.nodes].sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x);
  const byId = new Map(ordered.map((node) => [node.id, node]));
  const children = new Map(ordered.map((node) => [node.id, [] as MindMapNode[]]));
  const incoming = new Set<string>();
  for (const { from, to } of map.edges) {
    const target = byId.get(to);
    const targets = children.get(from);
    if (!target || !targets) continue;
    targets.push(target);
    incoming.add(to);
  }

  const columns: MindMapNode[][] = [];
  const visited = new Set<string>();
  const queue: { node: MindMapNode; depth: number }[] = [];
  function enqueue(node: MindMapNode, depth: number) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    queue.push({ node, depth });
  }

  let cursor = 0;
  function placeQueued() {
    while (cursor < queue.length) {
      const { node, depth } = queue[cursor++];
      (columns[depth] ??= []).push(node);
      for (const child of children.get(node.id) ?? []) enqueue(child, depth + 1);
    }
  }

  for (const node of ordered) {
    if (!incoming.has(node.id)) enqueue(node, 0);
  }
  placeQueued();
  for (const seed of ordered) {
    if (visited.has(seed.id)) continue;
    enqueue(seed, 0);
    placeQueued();
  }

  const heights = columns.map((nodes) => nodes.reduce((height, node) => height + node.size.height + rowGap, -rowGap));
  const tallest = heights.reduce((maximum, height) => Math.max(maximum, height), 0);
  const positions = new Map<string, Point>();
  let x = bounds.left;
  columns.forEach((nodes, index) => {
    let y = bounds.top + (tallest - heights[index]) / 2;
    let width = 0;
    for (const node of nodes) {
      positions.set(node.id, { x, y });
      width = Math.max(width, node.size.width);
      y += node.size.height + rowGap;
    }
    x += width + columnGap;
  });

  return { ...map, nodes: map.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })) };
}
