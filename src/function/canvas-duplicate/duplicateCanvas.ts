import type { CanvasDocument } from "../../workspace/workspace";

export function duplicateCanvas(
  source: CanvasDocument, existingTitles: readonly string[], nextId: () => string = () => crypto.randomUUID(),
): CanvasDocument {
  const title = `${source.title.trim() || "未命名画布"} 副本`;
  const titles = new Set(existingTitles);
  let availableTitle = title;
  for (let suffix = 2; titles.has(availableTitle); suffix++) availableTitle = `${title} ${suffix}`;

  const copy = structuredClone(source);
  copy.id = nextId();
  copy.title = availableTitle;
  copy.items = copy.items.map((item) => ({ ...item, id: nextId() }));
  if (copy.mindMap) {
    const ids = new Map<string, string>();
    const nodes = copy.mindMap.nodes.map((node) => {
      const id = nextId();
      ids.set(node.id, id);
      return { ...node, id };
    });
    copy.mindMap = {
      nodes,
      edges: copy.mindMap.edges.flatMap((edge) => {
        const from = ids.get(edge.from);
        const to = ids.get(edge.to);
        return from && to ? [{ ...edge, id: nextId(), from, to }] : [];
      }),
    };
  }
  return copy;
}
