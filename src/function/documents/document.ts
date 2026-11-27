type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface DocumentMark {
  type: string;
  attrs?: Record<string, JsonValue>;
}

interface DocumentNode {
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

export declare function createNote(id: string, title?: string): Note;

export declare function copyDocumentContent(content: DocumentContent): DocumentContent;
