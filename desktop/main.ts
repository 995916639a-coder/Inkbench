import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { desktopChannels } from "../src/workspace/desktopWorkspace";
import type { Workspace } from "../src/workspace/workspace";
import { getZoomPercent, registerWindowShortcuts, setZoomPercent, toggleMaximized } from "./window";
import { createWorkspaceStore } from "./workspaceStore";

let mainWindow: BrowserWindow | null = null;

function getSenderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  if (!mainWindow || event.sender !== mainWindow.webContents
    || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("无法处理此窗口的请求");
  }
  return mainWindow;
}

async function start(): Promise<void> {
  const store = createWorkspaceStore(join(app.getPath("userData"), "workspace.json"));
  ipcMain.handle(desktopChannels.loadWorkspace, (event) => {
    getSenderWindow(event);
    return store.loadWorkspace();
  });
  ipcMain.handle(desktopChannels.saveWorkspace, (event, workspace: Workspace) => {
    getSenderWindow(event);
    return store.saveWorkspace(workspace);
  });
  ipcMain.handle(desktopChannels.toggleMaximized, (event) => toggleMaximized(getSenderWindow(event)));
  ipcMain.handle(desktopChannels.getZoomPercent, (event) => getZoomPercent(getSenderWindow(event)));
  ipcMain.handle(desktopChannels.setZoomPercent, (event, percent: number) => setZoomPercent(getSenderWindow(event), percent));

  Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    title: "墨栈（Inkbench）",
    width: 1320,
    height: 880,
    minWidth: 820,
    minHeight: 600,
    icon: join(__dirname, "../renderer/inkbench.png"),
    backgroundColor: "#f9f8f4",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = window;
  window.once("ready-to-show", () => {
    window.maximize();
    window.show();
  });
  registerWindowShortcuts(window);
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:\/\/|mailto:)/i.test(url)) void shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  let closing = false;
  let readyToClose = false;
  window.on("close", (event) => {
    if (readyToClose) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    void closeAfterSave();
  });
  window.on("closed", () => { mainWindow = null; });
  await window.loadFile(join(__dirname, "../renderer/index.html"));

  async function closeAfterSave() {
    try {
      await store.flush();
    } catch {
      const { response } = await dialog.showMessageBox(window, {
        type: "warning",
        title: "工作区尚未保存",
        message: "最后一次保存失败。",
        detail: "返回墨栈可以重试保存。退出后会丢失尚未保存的编辑。",
        buttons: ["返回墨栈", "仍然退出"],
        defaultId: 0,
        cancelId: 0,
      });
      if (response !== 1) {
        closing = false;
        return;
      }
    }
    readyToClose = true;
    if (!window.isDestroyed()) window.close();
  }
}

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app.on("window-all-closed", () => app.quit());
  void app.whenReady().then(start).catch((error) => {
    console.error("Inkbench could not start:", error);
    app.quit();
  });
} else {
  app.quit();
}
