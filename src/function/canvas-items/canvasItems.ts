import type { Note } from "../documents";
import type { StrokePath } from "../drawing";
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
}

export type CanvasItem = NoteCard | TextBox | CanvasStroke;

export declare function addNoteCard(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
  note: NoteSnapshot,
): CanvasItem[];

export declare function addTextBox(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
): CanvasItem[];

export declare function addStroke(
  items: readonly CanvasItem[],
  id: string,
  points: StrokePath,
): CanvasItem[];

export declare function moveCanvasItem(
  items: readonly CanvasItem[],
  id: string,
  position: Point,
): CanvasItem[];

export declare function updateNoteCard(
  items: readonly CanvasItem[],
  id: string,
  note: NoteSnapshot,
): CanvasItem[];

export declare function updateTextBox(
  items: readonly CanvasItem[],
  id: string,
  text: string,
): CanvasItem[];

export declare function removeCanvasItem(items: readonly CanvasItem[], id: string): CanvasItem[];

export declare function undoLastStroke(items: readonly CanvasItem[]): CanvasItem[];
