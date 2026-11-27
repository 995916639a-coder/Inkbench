import type { Note } from "../documents";
import type { ArrowBend, StrokePath } from "../drawing";
import type { Point } from "../viewport";

type NoteSnapshot = Pick<Note, "title" | "content">;

export interface NoteCard extends NoteSnapshot {
  id: string;
  kind: "note-card";
  position: Point;
}

export interface TextBox {
  id: string;
  kind: "text-box";
  position: Point;
  text: string;
}

export interface CanvasStroke {
  id: string;
  kind: "stroke";
  points: StrokePath;
  style?: "arrow";
  bend?: ArrowBend;
}

export type CanvasItem = NoteCard | TextBox | CanvasStroke;

export function addNoteCard(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
  note: NoteSnapshot,
): CanvasItem[] {
  return [...items, { ...note, id, kind: "note-card", position }];
}

export function addTextBox(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
): CanvasItem[] {
  return [...items, { id, kind: "text-box", position, text: "" }];
}

export function addStroke(
  items: readonly CanvasItem[],
  id: string,
  points: StrokePath,
  annotation?: { style: "arrow"; bend?: ArrowBend },
): CanvasItem[] {
  return [...items, { id, kind: "stroke", points, ...annotation }];
}

export function moveCanvasItem(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
): CanvasItem[] {
  return items.map((item) => item.id === id && item.kind !== "stroke" ? { ...item, position } : item);
}

export function updateNoteCard(
  items: readonly CanvasItem[],
  id: string,
  note: NoteSnapshot,
): CanvasItem[] {
  return items.map((item) => item.id === id && item.kind === "note-card" ? { ...item, ...note } : item);
}

export function updateTextBox(
  items: readonly CanvasItem[],
  id: string,
  text: string,
): CanvasItem[] {
  return items.map((item) => item.id === id && item.kind === "text-box" ? { ...item, text } : item);
}

export function removeCanvasItem(items: readonly CanvasItem[], id: string): CanvasItem[] {
  return items.filter((item) => item.id !== id);
}

export function undoLastStroke(items: readonly CanvasItem[]): CanvasItem[] {
  const index = items.findLastIndex((item) => item.kind === "stroke");
  return items.filter((_, itemIndex) => itemIndex !== index);
}
