import type { WorkspaceStorage } from "./workspace";
import type { TranslateText } from "../function/note-translation";

export const desktopChannels = {
  loadWorkspace: "inkbench:workspace:load",
  saveWorkspace: "inkbench:workspace:save",
  toggleMaximized: "inkbench:window:toggle-maximized",
  getZoomPercent: "inkbench:window:get-zoom-percent",
  setZoomPercent: "inkbench:window:set-zoom-percent",
  zoomChanged: "inkbench:window:zoom-changed",
  translate: "inkbench:translation:translate",
  cancelTranslation: "inkbench:translation:cancel",
} as const;

export const minimumZoomPercent = 80;
export const maximumZoomPercent = 150;
export const defaultZoomPercent = 100;
export const zoomStep = 10;

export interface WindowZoom {
  getPercent(): Promise<number>;
  setPercent(percent: number): Promise<void>;
  onChange(listener: (percent: number) => void): () => void;
}

export interface DesktopBridge extends WorkspaceStorage {
  toggleMaximized(): Promise<void>;
  zoom: WindowZoom;
  translation: DesktopTranslation;
}

export interface DesktopTranslation {
  translate: TranslateText;
  cancel(): Promise<void>;
}

declare global {
  interface Window {
    inkbench?: DesktopBridge;
  }
}
