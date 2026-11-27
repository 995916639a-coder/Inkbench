import { contextBridge, ipcRenderer } from "electron";
import { desktopChannels } from "../src/workspace/desktopWorkspace";
import type { DesktopBridge } from "../src/workspace/desktopWorkspace";

const bridge: DesktopBridge = {
  loadWorkspace: () => ipcRenderer.invoke(desktopChannels.loadWorkspace),
  saveWorkspace: (workspace) => ipcRenderer.invoke(desktopChannels.saveWorkspace, workspace),
  toggleMaximized: () => ipcRenderer.invoke(desktopChannels.toggleMaximized),
  zoom: {
    getPercent: () => ipcRenderer.invoke(desktopChannels.getZoomPercent),
    setPercent: (percent) => ipcRenderer.invoke(desktopChannels.setZoomPercent, percent),
    onChange: (listener) => {
      const receive = (_event: Electron.IpcRendererEvent, percent: number) => listener(percent);
      ipcRenderer.on(desktopChannels.zoomChanged, receive);
      return () => { ipcRenderer.removeListener(desktopChannels.zoomChanged, receive); };
    },
  },
};

contextBridge.exposeInMainWorld("inkbench", bridge);
