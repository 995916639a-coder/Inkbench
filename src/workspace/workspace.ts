import type { CanvasItem } from "../function/canvas-items";
import type { Note } from "../function/documents";
import type { MindMap } from "../function/mind-map";
import type { LanguageVersions, MindMapLabels } from "../function/mind-map-translation";
import type { CanvasViewport } from "../function/viewport";

export interface CanvasDocument {
  id: string;
  title: string;
  items: readonly CanvasItem[];
  mindMap?: MindMap;
  mapTranslation?: LanguageVersions<MindMapLabels>;
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
  sidebarCollapsed?: boolean;
}

export interface WorkspaceStorage {
  loadWorkspace(): Promise<Workspace | null>;
  saveWorkspace(workspace: Workspace): Promise<void>;
}

export function createCanvas(id: string, title = "未命名画布"): CanvasDocument {
  return { id, title, items: [], viewport: { offset: { x: 0, y: 0 }, scale: 1 } };
}
