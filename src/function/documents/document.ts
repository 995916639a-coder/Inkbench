type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface DocumentMark {
  type: string;
  attrs?: Record<string, JsonValue>;
}

export interface DocumentNode {
  type: string;
  attrs?: Record<string, JsonValue>;
  content?: DocumentNode[];
  marks?: DocumentMark[];
  text?: string;
}

export interface DocumentContent extends DocumentNode {
  type: "doc";
}

export interface Note {
  id: string;
  title: string;
  content: DocumentContent;
}

export function createNote(id: string, title = "未命名笔记"): Note {
  return { id, title, content: { type: "doc", content: [{ type: "paragraph" }] } };
}

export function copyDocumentContent(content: DocumentContent): DocumentContent {
  return structuredClone(content);
}
