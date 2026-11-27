import type { CanvasItem } from "../function/canvas-items";
import type { Note } from "../function/documents";
import type { CanvasViewport } from "../function/viewport";

export interface CanvasDocument {
  id: string;
  title: string;
  items: readonly CanvasItem[];
  viewport: CanvasViewport;
}

export interface WorkspaceEntry {
  kind: "note" | "canvas";
  id: string;
}

export interface Workspace {
  version: 1;
  notes: readonly Note[];
  canvases: readonly CanvasDocument[];
  activeEntry: WorkspaceEntry | null;
}

export interface WorkspaceStorage {
  loadWorkspace(): Promise<Workspace | null>;
  saveWorkspace(workspace: Workspace): Promise<void>;
}

export declare function createCanvas(id: string, title?: string): CanvasDocument;
