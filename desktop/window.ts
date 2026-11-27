import type { BrowserWindow } from "electron";

export function toggleMaximized(window: BrowserWindow): void {
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
}

export function registerWindowShortcuts(window: BrowserWindow): void {
  const { webContents } = window;
  webContents.on("before-input-event", (event, input) => {
    if (input.isComposing || input.alt || input.meta) return;

    if (input.key === "F11" && !input.control && !input.shift) {
      event.preventDefault();
      if (input.type === "keyDown" && !input.isAutoRepeat) toggleMaximized(window);
      return;
    }

    if (!input.control || input.type !== "keyDown") return;
    let step: number;
    switch (input.key) {
      case "+":
      case "=":
        step = 10;
        break;
      case "-":
        step = -10;
        break;
      case "0":
        step = 0;
        break;
      default:
        return;
    }

    event.preventDefault();
    if (step === 0) {
      webContents.setZoomFactor(1);
    } else {
      const percent = Math.round(webContents.getZoomFactor() * 100);
      const next = Math.min(150, Math.max(80, percent + step));
      if (next !== percent) webContents.setZoomFactor(next / 100);
    }
  });
}
