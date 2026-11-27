import type { WorkspaceStorage } from "./workspace";

export const desktopChannels = {
  loadWorkspace: "inkbench:workspace:load",
  saveWorkspace: "inkbench:workspace:save",
  toggleFullscreen: "inkbench:window:toggle-fullscreen",
} as const;

export interface DesktopBridge extends WorkspaceStorage {
  toggleFullscreen(): Promise<boolean>;
}

declare global {
  interface Window {
    inkbench?: DesktopBridge;
  }
}
