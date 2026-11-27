import type { BrowserWindow } from "electron";
import { defaultZoomPercent, desktopChannels, maximumZoomPercent, minimumZoomPercent, zoomStep } from "../src/workspace/desktopWorkspace";

export function toggleMaximized(window: BrowserWindow): void {
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
}

export function getZoomPercent(window: BrowserWindow): number {
  return Math.round(window.webContents.getZoomFactor() * 100);
}

export function setZoomPercent(window: BrowserWindow, percent: number): void {
  if (!Number.isInteger(percent)) throw new TypeError("界面缩放比例必须是整数");
  const next = Math.min(maximumZoomPercent, Math.max(minimumZoomPercent, percent));
  if (next === getZoomPercent(window)) return;
  window.webContents.setZoomFactor(next / 100);
  window.webContents.send(desktopChannels.zoomChanged, next);
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
        step = zoomStep;
        break;
      case "-":
        step = -zoomStep;
        break;
      case "0":
        step = 0;
        break;
      default:
        return;
    }

    event.preventDefault();
    setZoomPercent(window, step === 0 ? defaultZoomPercent : getZoomPercent(window) + step);
  });
}
