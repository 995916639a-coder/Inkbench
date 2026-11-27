import type { WorkspaceStorage } from "./workspace";

export interface DesktopBridge extends WorkspaceStorage {
  toggleFullscreen(): Promise<boolean>;
}

declare global {
  interface Window {
    inkbench?: DesktopBridge;
  }
}
