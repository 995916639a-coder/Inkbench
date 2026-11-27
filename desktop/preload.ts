import { contextBridge, ipcRenderer } from "electron";
import { desktopChannels } from "../src/workspace/desktopWorkspace";
import type { DesktopBridge } from "../src/workspace/desktopWorkspace";

const bridge: DesktopBridge = {
  loadWorkspace: () => ipcRenderer.invoke(desktopChannels.loadWorkspace),
  saveWorkspace: (workspace) => ipcRenderer.invoke(desktopChannels.saveWorkspace, workspace),
  toggleFullscreen: () => ipcRenderer.invoke(desktopChannels.toggleFullscreen),
};

contextBridge.exposeInMainWorld("inkbench", bridge);
