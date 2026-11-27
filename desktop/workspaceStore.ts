import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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
    return Array.isArray(value.points) && value.points.length > 0 && value.points.every(isPoint);
  }
  if (!isPoint(value.position)) return false;
  if (value.kind === "note-card") return hasDocument(value);
  return value.kind === "text-box" && typeof value.text === "string";
}

function isCanvas(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string"
    && Array.isArray(value.items) && value.items.every(isCanvasItem)
    && isRecord(value.viewport) && isPoint(value.viewport.offset)
    && typeof value.viewport.scale === "number" && Number.isFinite(value.viewport.scale)
    && value.viewport.scale > 0;
}

function isWorkspace(value: unknown): value is Workspace {
  return isRecord(value) && value.version === 1
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
