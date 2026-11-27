import type { MindMap, MindMapNode } from "./mindMap";

interface Branch {
  node: MindMapNode;
  depth: number;
  children: Branch[];
}

export function mindMapHierarchy(map: MindMap) {
  const byId = new Map(map.nodes.map((node) => [node.id, node]));
  const outgoing = new Map(map.nodes.map((node) => [node.id, [] as MindMapNode[]]));
  const incoming = new Set<string>();
  for (const { from, to } of map.edges) {
    const source = outgoing.get(from);
    const target = byId.get(to);
    if (!source || !target) continue;
    source.push(target);
    incoming.add(to);
  }

  const roots: Branch[] = [];
  const depthById = new Map<string, number>();
  const queue: Branch[] = [];

  function add(node: MindMapNode, depth: number, siblings: Branch[]) {
    if (depthById.has(node.id)) return;
    const branch: Branch = { node, depth, children: [] };
    siblings.push(branch);
    queue.push(branch);
    depthById.set(node.id, depth);
  }

  let cursor = 0;
  function visit() {
    while (cursor < queue.length) {
      const branch = queue[cursor++];
      for (const target of outgoing.get(branch.node.id) ?? []) {
        add(target, branch.depth + 1, branch.children);
      }
    }
  }

  for (const node of map.nodes) {
    if (!incoming.has(node.id)) add(node, 0, roots);
  }
  visit();
  // Components with a cycle may have no node without incoming links.
  for (const node of map.nodes) {
    if (depthById.has(node.id)) continue;
    add(node, 0, roots);
    visit();
  }
  return { roots, depthById };
}
