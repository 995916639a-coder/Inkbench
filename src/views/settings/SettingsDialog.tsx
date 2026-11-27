import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { setInterfaceLanguage, useTranslation } from "../../i18n";
import { defaultZoomPercent, maximumZoomPercent, minimumZoomPercent, zoomStep } from "../../workspace/desktopWorkspace";
import type { WindowZoom } from "../../workspace/desktopWorkspace";
import "./settings.css";

interface SettingsDialogProps {
  zoom?: WindowZoom;
  onClose: () => void;
}

export function SettingsDialog({ zoom, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { dialog.current?.showModal(); }, []);

  useEffect(() => {
    if (!zoom) return;
    let active = true;
    let receivedChange = false;
    const unsubscribe = zoom.onChange((next) => {
      receivedChange = true;
      setError(null);
      setPercent(next);
    });
    void zoom.getPercent().then((current) => {
      if (active && !receivedChange) setPercent(current);
    }).catch(() => {
      if (active && !receivedChange) setError(t("无法读取界面缩放"));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [zoom]);

  function changeZoom(next: number) {
    setError(null);
    void zoom?.setPercent(next).catch(() => setError(t("无法调整界面缩放")));
  }

  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onClose={onClose}
    onClick={(event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }}>
    <div className="settings-panel">
      <header className="settings-header">
        <h1 id="settings-title">{t("设置")}</h1>
        <button type="button" className="icon-button" aria-label={t("关闭设置")} autoFocus
          onClick={() => dialog.current?.close()}><X size={17} /></button>
      </header>
      <div className="settings-content">
        <div className="settings-row settings-language">
          <label htmlFor="settings-language">{t("界面语言")}</label>
          <select id="settings-language" value={i18n.language} onChange={(event) => {
            void setInterfaceLanguage(event.currentTarget.value === "en" ? "en" : "zh-CN");
          }}>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <h2 id="settings-zoom">{t("界面缩放")}</h2>
            <p>{zoom ? t("调整侧栏、编辑器和画布界面的显示大小。") : t("在预览中，使用浏览器的页面缩放快捷键。")}</p>
          </div>
          {zoom && <div className="settings-zoom" role="group" aria-labelledby="settings-zoom">
            <button type="button" className="icon-button" aria-label={t("缩小界面")} disabled={percent === null || percent <= minimumZoomPercent}
              onClick={() => { if (percent !== null) changeZoom(percent - zoomStep); }}><Minus size={15} /></button>
            <span aria-live="polite">{percent === null ? "—" : `${percent}%`}</span>
            <button type="button" className="icon-button" aria-label={t("放大界面")} disabled={percent === null || percent >= maximumZoomPercent}
              onClick={() => { if (percent !== null) changeZoom(percent + zoomStep); }}><Plus size={15} /></button>
          </div>}
        </div>
        {zoom && <div className="settings-reset">
          <button type="button" className="secondary-button" disabled={percent === null || percent === defaultZoomPercent}
            onClick={() => changeZoom(defaultZoomPercent)}>{t("恢复 100%")}</button>
        </div>}
        {error && <p className="settings-error" role="alert">{error}</p>}
      </div>
    </div>
  </dialog>;
}
