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

export interface NoteContent {
  title: string;
  content: DocumentContent;
}

export interface Note extends NoteContent {
  id: string;
  translation?: { language: "zh-CN" | "en"; alternate: NoteContent };
}

export function switchSavedNoteLanguage(note: Note): Note {
  const { translation, title, content } = note;
  if (!translation) return note;
  const language = translation.language === "zh-CN" ? "en" : "zh-CN";
  return {
    ...note, title: translation.alternate.title, content: translation.alternate.content,
    translation: { language, alternate: { title, content } },
  };
}

export function createNote(id: string, title = "未命名笔记"): Note {
  return { id, title, content: { type: "doc", content: [{ type: "paragraph" }] } };
}

export function copyDocumentContent(content: DocumentContent): DocumentContent {
  return structuredClone(content);
}
