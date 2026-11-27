import { useRef } from "react";
import type { MindMap } from "../../function/mind-map";
import type { CanvasViewport } from "../../function/viewport";
import type { CanvasDocument } from "../../workspace/workspace";

export interface MindMapSnapshot {
  map: MindMap;
  viewport?: CanvasViewport;
  mapTranslation?: CanvasDocument["mapTranslation"] | null;
}

interface HistoryEntry {
  before: MindMapSnapshot;
  after: MindMapSnapshot;
  action?: string;
  mergeKey?: string;
  time: number;
}

export function useMindMapHistory() {
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);

  function record(before: MindMapSnapshot, after: MindMapSnapshot, options?: { action?: string; mergeKey?: string }) {
    const time = Date.now();
    const last = past.current.at(-1);
    if (options?.mergeKey && last?.mergeKey === options.mergeKey && last.after.map === before.map && time - last.time < 800) {
      last.after = after;
      last.time = time;
    } else {
      past.current.push({ before, after, ...options, time });
      if (past.current.length > 64) past.current.shift();
    }
    future.current = [];
  }

  function undo() {
    const entry = past.current.pop();
    if (!entry) return undefined;
    entry.time = 0;
    future.current.push(entry);
    return entry.before;
  }

  function redo() {
    const entry = future.current.pop();
    if (!entry) return undefined;
    past.current.push(entry);
    return entry.after;
  }

  return {
    record, undo, redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    lastAction: past.current.at(-1)?.action,
  };
}
