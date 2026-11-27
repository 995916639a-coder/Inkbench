import type { WorkspaceStorage } from "./workspace";

export const desktopChannels = {
  loadWorkspace: "inkbench:workspace:load",
  saveWorkspace: "inkbench:workspace:save",
  toggleMaximized: "inkbench:window:toggle-maximized",
} as const;

export interface DesktopBridge extends WorkspaceStorage {
  toggleMaximized(): Promise<void>;
}

declare global {
  interface Window {
    inkbench?: DesktopBridge;
  }
}
