import { utilityProcess } from "electron";
import type { UtilityProcess } from "electron";
import { isTranslationDirection } from "../src/function/note-translation";

export function createTranslationService(workerPath: string, modelsPath: string) {
  let worker: UtilityProcess | undefined;
  let pending: { resolve: (texts: string[]) => void; reject: (error: Error) => void } | undefined;

  function cancel() {
    const previous = worker;
    worker = undefined;
    pending?.reject(new Error("Translation stopped"));
    pending = undefined;
    previous?.kill();
  }

  function translate(direction: unknown, segments: unknown): Promise<string[]> {
    if (!isTranslationDirection(direction) || !Array.isArray(segments) || !segments.length
      || !segments.every((text) => typeof text === "string" && text.trim().length > 0)) {
      return Promise.reject(new Error("Invalid translation request"));
    }
    if (pending) return Promise.reject(new Error("Translation is already running"));
    if (!worker) {
      const next = utilityProcess.fork(workerPath, [modelsPath], { serviceName: "Inkbench offline translation" });
      worker = next;
      next.on("exit", () => { if (worker === next) cancel(); });
      next.on("error", () => { if (worker === next) cancel(); });
      next.on("message", (result: { texts?: string[] }) => {
        if (worker !== next || !pending) return;
        const { resolve, reject } = pending;
        pending = undefined;
        if (result.texts) resolve(result.texts);
        else reject(new Error("Offline translation failed"));
      });
    }
    const selected = worker;
    return new Promise((resolve, reject) => {
      pending = { resolve, reject };
      const send = () => { if (worker === selected) selected.postMessage({ direction, segments }); };
      if (selected.pid) send();
      else selected.once("spawn", send);
    });
  }

  return { translate, cancel };
}
