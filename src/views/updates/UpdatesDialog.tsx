import { useTranslation } from "../../i18n";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Markdown from "react-markdown";
import announcement from "../../../update.md?raw";
import "./updates.css";

interface UpdatesDialogProps {
  onClose: () => void;
}

export function UpdatesDialog({ onClose }: UpdatesDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="updates-dialog"
      aria-labelledby="updates-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="updates-header">
        <h1 id="updates-title">{t("更新公告")}</h1>
        <button type="button" className="icon-button" aria-label={t("关闭更新公告")} autoFocus
          onClick={() => dialog.current?.close()}><X size={17} /></button>
      </header>
      <div className="updates-content">
        <Markdown skipHtml components={{
          a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}>{announcement}</Markdown>
      </div>
    </dialog>
  );
}
