import type { DocumentNode, Note } from "../documents";
import type { Point } from "../viewport";
import { createMindMapNode } from "./mindMap";
import type { MindMap, MindMapEdge, MindMapNode } from "./mindMap";
import { organizeMindMap } from "./organizeMindMap";

interface Topic {
  text: string;
  children: Topic[];
}

function topic(text: string): Topic {
  return { text, children: [] };
}

function plainText(node: DocumentNode): string {
  return node.type === "hardBreak" ? " " : node.text ?? node.content?.map(plainText).join("") ?? "";
}

function topicTree(note: Pick<Note, "title" | "content">): Topic {
  const root = topic(note.title.trim() || "未命名笔记");
  const headings = [{ depth: 0, topic: root }];
  const blocks = note.content.content ?? [];
  const hasOutline = blocks.some(({ type }) => type === "heading" || type === "bulletList" || type === "orderedList");

  function addList(list: DocumentNode, parent: Topic) {
    for (const item of list.content ?? []) {
      const parts = item.content ?? [];
      const text = parts.filter((part) => part.type === "paragraph").map(plainText).join(" ").trim();
      const child = topic(text || "列表项");
      parent.children.push(child);
      for (const part of parts) {
        if (part.type === "bulletList" || part.type === "orderedList") addList(part, child);
      }
    }
  }

  for (const block of blocks) {
    if (block.type === "heading") {
      const depth = Number(block.attrs?.level ?? 1);
      while (headings.length > 1 && headings[headings.length - 1].depth >= depth) headings.pop();
      const child = topic(plainText(block).trim() || "未命名标题");
      headings[headings.length - 1].topic.children.push(child);
      headings.push({ depth, topic: child });
    } else if (block.type === "bulletList" || block.type === "orderedList") {
      addList(block, headings[headings.length - 1].topic);
    } else if (!hasOutline && block.type === "paragraph") {
      const text = plainText(block).trim();
      if (text) root.children.push(topic(text));
    }
  }
  return root;
}

export function createMarkdownMindMap(note: Pick<Note, "title" | "content">, origin: Point, nextId: () => string): MindMap {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];
  const pending = [{ branch: topicTree(note), id: nextId() }];
  for (let index = 0; index < pending.length; index++) {
    const { branch, id } = pending[index];
    nodes.push(createMindMapNode(id, index === 0 ? "ellipse" : "rectangle", origin, branch.text));
    for (const child of branch.children) {
      const childId = nextId();
      pending.push({ branch: child, id: childId });
      edges.push({ id: nextId(), from: id, to: childId });
    }
  }
  return organizeMindMap({ nodes, edges });
}
