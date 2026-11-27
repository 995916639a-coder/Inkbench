import type { Definition, PhrasingContent, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { DocumentMark, DocumentNode, Note } from "../documents";

const parser = unified().use(remarkParse).use(remarkGfm);

function textNode(text: string, marks: DocumentMark[] = []): DocumentNode[] {
  return text ? [{ type: "text", text, ...(marks.length ? { marks } : {}) }] : [];
}

export async function importMarkdownFile(file: File): Promise<Pick<Note, "title" | "content">> {
  if (!/\.(md|markdown)$/i.test(file.name)) {
    throw new Error("请选择 .md 或 .markdown 文件。");
  }

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    if (source.includes("\0")) throw new Error("Invalid text");
  } catch {
    throw new Error("无法读取文件，请确认它是 UTF-8 编码的 Markdown 文本。");
  }

  const root = parser.parse(source);
  const definitions = new Map<string, Definition>();
  collectDefinitions(root.children);
  const content = root.children.flatMap(block);
  const title = file.name.replace(/\.(md|markdown)$/i, "").trim() || "未命名笔记";
  return {
    title,
    content: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] },
  };

  function collectDefinitions(nodes: RootContent[]) {
    for (const node of nodes) {
      if (node.type === "definition" && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, node);
      } else if (node.type === "blockquote" || node.type === "list" || node.type === "listItem") {
        collectDefinitions(node.children);
      }
    }
  }

  function original(node: RootContent): string {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    return start === undefined || end === undefined ? "" : source.slice(start, end);
  }

  function inline(node: PhrasingContent, marks: DocumentMark[] = []): DocumentNode[] {
    switch (node.type) {
      case "text": return textNode(node.value, marks);
      case "inlineCode":
        return textNode(node.value, marks.some(({ type }) => type === "link") ? marks : [{ type: "code" }]);
      case "break": return [{ type: "hardBreak", marks }];
      case "strong":
      case "emphasis":
      case "delete": {
        const type = { strong: "bold", emphasis: "italic", delete: "strike" }[node.type];
        return node.children.flatMap((child) => inline(child, [...marks, { type }]));
      }
      case "link":
      case "linkReference": {
        const href = node.type === "link" ? node.url : definitions.get(node.identifier)?.url;
        if (!href || !/^(https?:\/\/|mailto:|#)/i.test(href)) return textNode(original(node), marks);
        return node.children.flatMap((child) => inline(child, [...marks, { type: "link", attrs: { href } }]));
      }
      default: return textNode(original(node), marks);
    }
  }

  function block(node: RootContent): DocumentNode[] {
    switch (node.type) {
      case "paragraph": return [{ type: "paragraph", content: node.children.flatMap((child) => inline(child)) }];
      case "heading": return [{
        type: "heading", attrs: { level: node.depth },
        content: node.children.flatMap((child) => inline(child)),
      }];
      case "code": return [{
        type: "codeBlock", attrs: { language: node.lang ?? null },
        content: textNode(node.value),
      }];
      case "thematicBreak": return [{ type: "horizontalRule" }];
      case "blockquote": {
        const children = node.children.flatMap(block);
        return [{ type: "blockquote", content: children.length ? children : [{ type: "paragraph" }] }];
      }
      case "list": return [{
        type: node.ordered ? "orderedList" : "bulletList",
        ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}),
        content: node.children.flatMap(block),
      }];
      case "listItem": {
        const children = node.children.flatMap(block);
        if (children[0]?.type !== "paragraph") children.unshift({ type: "paragraph" });
        if (typeof node.checked === "boolean") {
          children[0].content = [
            ...textNode(node.checked ? "[x] " : "[ ] "),
            ...(children[0].content ?? []),
          ];
        }
        return [{ type: "listItem", content: children }];
      }
      default:
        return [{ type: "codeBlock", attrs: { language: "plaintext" }, content: textNode(original(node)) }];
    }
  }
}
