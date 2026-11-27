import { mindMapBounds } from "./mindMap";
import type { MindMap, MindMapNode } from "./mindMap";
import { mindMapHierarchy } from "./mindMapHierarchy";
import type { Point } from "../viewport";

type Branch = ReturnType<typeof mindMapHierarchy>["roots"][number];

const columnGap = 84;
const siblingGap = 22;
const branchGap = 46;
const groupGap = 88;

function span(branches: readonly Branch[], heights: Map<Branch, number>, gap: number): number {
  return branches.reduce((total, branch) => total + heights.get(branch)!, 0) + Math.max(0, branches.length - 1) * gap;
}

function layoutTree(root: Branch): MindMapNode[] {
  // Give an imported file's single heading room to open on both sides.
  const ancestors: Branch[] = [];
  let hub = root;
  while (hub.children.length === 1) {
    ancestors.push(hub);
    hub = hub.children[0];
  }
  if (!hub.children.length) {
    hub = root;
    ancestors.length = 0;
  }

  const order = [hub];
  for (let index = 0; index < order.length; index++) {
    for (const child of order[index].children) order.push(child);
  }
  const heights = new Map<Branch, number>();
  for (let index = order.length - 1; index >= 0; index--) {
    const branch = order[index];
    heights.set(branch, Math.max(branch.node.size.height, span(branch.children, heights, siblingGap)));
  }

  const placed: MindMapNode[] = [{ ...hub.node, position: { x: -hub.node.size.width / 2, y: -hub.node.size.height / 2 } }];
  const left: Branch[] = [];
  const right: Branch[] = [];
  let leftHeight = 0;
  let rightHeight = 0;
  const byHeight = [...hub.children].sort((a, b) => heights.get(b)! - heights.get(a)!);
  const rightSide = new Set<Branch>();
  for (const child of byHeight) {
    const height = heights.get(child)! + branchGap;
    if (rightHeight <= leftHeight) {
      rightSide.add(child);
      rightHeight += height;
    } else leftHeight += height;
  }
  for (const child of hub.children) {
    (rightSide.has(child) ? right : left).push(child);
  }
  placeSide(left, -1);
  placeSide(right, 1);

  let top = -hub.node.size.height / 2;
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const { node } = ancestors[index];
    top -= node.size.height + siblingGap * 2;
    placed.push({ ...node, position: { x: -node.size.width / 2, y: top } });
  }
  return placed;

  function placeSide(branches: Branch[], direction: -1 | 1) {
    const widths: number[] = [];
    const pending = branches.map((branch) => ({ branch, column: 0 }));
    for (let index = 0; index < pending.length; index++) {
      const { branch, column } = pending[index];
      widths[column] = Math.max(widths[column] ?? 0, branch.node.size.width);
      for (const child of branch.children) pending.push({ branch: child, column: column + 1 });
    }
    const columns: number[] = [];
    let offset = hub.node.size.width / 2 + columnGap;
    for (const width of widths) {
      columns.push(offset);
      offset += width + columnGap;
    }

    const positions: { branch: Branch; column: number; top: number }[] = [];
    enqueue(branches, 0, -span(branches, heights, branchGap) / 2, branchGap);
    for (let index = 0; index < positions.length; index++) {
      const { branch, column, top } = positions[index];
      const { node } = branch;
      const height = heights.get(branch)!;
      const center = top + height / 2;
      const x = direction === 1 ? columns[column] : -columns[column] - node.size.width;
      placed.push({ ...node, position: { x, y: center - node.size.height / 2 } });
      const childrenTop = center - span(branch.children, heights, siblingGap) / 2;
      enqueue(branch.children, column + 1, childrenTop, siblingGap);
    }

    function enqueue(siblings: Branch[], column: number, top: number, gap: number) {
      for (const branch of siblings) {
        positions.push({ branch, column, top });
        top += heights.get(branch)! + gap;
      }
    }
  }
}

export function organizeMindMap(map: MindMap): MindMap {
  const anchor = mindMapBounds(map.nodes);
  if (!anchor || map.nodes.length < 2) return map;

  const { roots } = mindMapHierarchy(map);
  const groups = roots.map((root) => {
    const nodes = layoutTree(root);
    const bounds = mindMapBounds(nodes)!;
    return { nodes, bounds, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
  });
  const area = groups.reduce((total, group) => total + (group.width + groupGap) * (group.height + groupGap), 0);
  const targetWidth = Math.sqrt(area * 1.8);
  const positions = new Map<string, Point>();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const { nodes, bounds, width, height } of groups) {
    if (x > 0 && x + width > targetWidth) {
      x = 0;
      y += rowHeight + groupGap;
      rowHeight = 0;
    }
    for (const node of nodes) {
      positions.set(node.id, {
        x: anchor.left + x + node.position.x - bounds.left,
        y: anchor.top + y + node.position.y - bounds.top,
      });
    }
    x += width + groupGap;
    rowHeight = Math.max(rowHeight, height);
  }
  return { ...map, nodes: map.nodes.map((node) => ({ ...node, position: positions.get(node.id)! })) };
}
