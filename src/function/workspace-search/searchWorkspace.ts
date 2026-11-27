import type { DocumentNode } from "../documents";
import type { Workspace, WorkspaceEntry } from "../../workspace/workspace";

export interface WorkspaceSearchResult {
  entry: WorkspaceEntry;
  title: string;
  excerpt?: string;
  nodeId?: string;
}

function plainText(node: DocumentNode): string {
  if (node.type === "hardBreak") return " ";
  if (node.text !== undefined) return node.text;
  const inline = node.type === "heading" || node.type === "paragraph" || node.type === "codeBlock";
  return node.content?.map(plainText).join(inline ? "" : " ") ?? "";
}

function compact(text: string) {
  return text.replace(/\s+/gu, " ").trim();
}

function excerpt(text: string, query: string): string | undefined {
  const line = compact(text);
  const at = line.toLowerCase().indexOf(query);
  if (at < 0) return undefined;
  const leading = Math.max(0, at - 24);
  const trailing = Math.min(line.length, at + Math.max(40, query.length) + 20);
  return `${leading ? "…" : ""}${line.slice(leading, trailing)}${trailing < line.length ? "…" : ""}`;
}

export function searchWorkspace(workspace: Workspace, input: string, untitled = { note: "未命名笔记", canvas: "未命名画布" }): WorkspaceSearchResult[] {
  const query = compact(input).toLowerCase();
  const titles: WorkspaceSearchResult[] = [];
  const contents: WorkspaceSearchResult[] = [];
  for (const note of workspace.notes) {
    const title = note.title || untitled.note;
    const entry = { kind: "note" as const, id: note.id };
    if (!query || compact(title).toLowerCase().includes(query)) {
      titles.push({ entry, title });
    } else {
      const match = excerpt(plainText(note.content), query);
      if (match) contents.push({ entry, title, excerpt: match });
    }
  }
  for (const canvas of workspace.canvases) {
    const title = canvas.title || untitled.canvas;
    const entry = { kind: "canvas" as const, id: canvas.id };
    if (!query || compact(title).toLowerCase().includes(query)) {
      titles.push({ entry, title });
      continue;
    }
    const node = canvas.mindMap?.nodes.find((candidate) => compact(candidate.text).toLowerCase().includes(query));
    if (node) {
      contents.push({ entry, title, excerpt: excerpt(node.text, query), nodeId: node.id });
      continue;
    }
    for (const item of canvas.items) {
      if (item.kind === "stroke") continue;
      const text = item.kind === "note-card" ? `${item.title} ${plainText(item.content)}` : item.text;
      const match = excerpt(text, query);
      if (match) {
        contents.push({ entry, title, excerpt: match });
        break;
      }
    }
  }
  return [...titles, ...contents];
}
