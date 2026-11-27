import type { MindMapNode } from "./mindMap";

export const mindMapTones = {
  sage: { label: "松绿", fill: "#e4eee3", border: "#9eb5a3", ink: "#315843" },
  sand: { label: "浅金", fill: "#f6edd8", border: "#c9b283", ink: "#6c522c" },
  blue: { label: "雾蓝", fill: "#e5edf2", border: "#a7becf", ink: "#3c5b71" },
  lilac: { label: "淡紫", fill: "#eee8f3", border: "#baa9ca", ink: "#644c75" },
} as const;

export type MindMapTone = keyof typeof mindMapTones;

export function mindMapNodeAppearance(node: Pick<MindMapNode, "shape" | "tone">) {
  if (node.tone) return mindMapTones[node.tone];
  return {
    fill: node.shape === "ellipse" ? "#edf2e8" : "#fffefa",
    border: "#bacbbd",
    ink: "#365b49",
  };
}
