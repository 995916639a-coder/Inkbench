import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mindMapTones } from "../src/function/mind-map";
import type { Workspace, WorkspaceStorage } from "../src/workspace/workspace";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): boolean {
  return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function isDocumentNode(value: unknown): boolean {
  return isRecord(value) && typeof value.type === "string"
    && (value.text === undefined || typeof value.text === "string")
    && (value.attrs === undefined || isRecord(value.attrs))
    && (value.marks === undefined || (Array.isArray(value.marks)
      && value.marks.every((mark) => isRecord(mark) && typeof mark.type === "string"
        && (mark.attrs === undefined || isRecord(mark.attrs)))))
    && (value.content === undefined || (Array.isArray(value.content) && value.content.every(isDocumentNode)));
}

function hasDocument(value: Record<string, unknown>): boolean {
  return typeof value.title === "string" && isRecord(value.content)
    && value.content.type === "doc" && isDocumentNode(value.content);
}

function isCanvasItem(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== "string") return false;
  if (value.kind === "stroke") {
    return Array.isArray(value.points) && value.points.length > 0 && value.points.every(isPoint)
      && (value.style === undefined || value.style === "arrow" && value.points.length === 2);
  }
  if (!isPoint(value.position)) return false;
  if (value.kind === "note-card") return hasDocument(value);
  return value.kind === "text-box" && typeof value.text === "string";
}

function isMindMap(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return false;
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!isRecord(node) || typeof node.id !== "string" || ids.has(node.id)
      || (node.shape !== "ellipse" && node.shape !== "rectangle")
      || (node.tone !== undefined && (typeof node.tone !== "string" || !Object.hasOwn(mindMapTones, node.tone)))
      || typeof node.text !== "string" || !isPoint(node.position) || !isRecord(node.size)
      || typeof node.size.width !== "number" || !Number.isFinite(node.size.width) || node.size.width <= 0
      || typeof node.size.height !== "number" || !Number.isFinite(node.size.height) || node.size.height <= 0) return false;
    ids.add(node.id);
  }
  const edgeIds = new Set<string>();
  return value.edges.every((edge) => {
    if (!isRecord(edge) || typeof edge.id !== "string" || edgeIds.has(edge.id) || ids.has(edge.id)
      || typeof edge.from !== "string" || typeof edge.to !== "string"
      || (edge.label !== undefined && typeof edge.label !== "string")
      || edge.from === edge.to || !ids.has(edge.from) || !ids.has(edge.to)) return false;
    edgeIds.add(edge.id);
    return true;
  });
}

function isCanvas(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string"
    && Array.isArray(value.items) && value.items.every(isCanvasItem)
    && (value.mindMap === undefined || isMindMap(value.mindMap))
    && isRecord(value.viewport) && isPoint(value.viewport.offset)
    && typeof value.viewport.scale === "number" && Number.isFinite(value.viewport.scale)
    && value.viewport.scale > 0;
}

function isWorkspace(value: unknown): value is Workspace {
  return isRecord(value) && value.version === 1
    && (value.sidebarCollapsed === undefined || typeof value.sidebarCollapsed === "boolean")
    && Array.isArray(value.notes)
    && value.notes.every((note) => isRecord(note) && typeof note.id === "string" && hasDocument(note))
    && Array.isArray(value.canvases) && value.canvases.every(isCanvas)
    && (value.activeEntry === null || (isRecord(value.activeEntry)
      && (value.activeEntry.kind === "note" || value.activeEntry.kind === "canvas")
      && typeof value.activeEntry.id === "string"));
}

interface WorkspaceStore extends WorkspaceStorage {
  flush(): Promise<void>;
}

export function createWorkspaceStore(filePath: string): WorkspaceStore {
  let pending = Promise.resolve();

  return {
    async loadWorkspace() {
      await pending.catch(() => {});
      let raw: string;
      try {
        raw = await readFile(filePath, "utf8");
      } catch (error) {
        if (isRecord(error) && error.code === "ENOENT") return null;
        throw error;
      }

      const value: unknown = JSON.parse(raw);
      if (!isWorkspace(value)) throw new Error("工作区文件格式无效");
      return value;
    },

    async saveWorkspace(workspace) {
      if (!isWorkspace(workspace)) throw new Error("工作区数据格式无效");
      const body = JSON.stringify(workspace);
      const temporaryFile = `${filePath}.tmp`;
      const write = pending.catch(() => {}).then(async () => {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(temporaryFile, body, { encoding: "utf8", mode: 0o600 });
        await rename(temporaryFile, filePath);
      });
      pending = write;
      await write;
    },

    flush() { return pending; },
  };
}
