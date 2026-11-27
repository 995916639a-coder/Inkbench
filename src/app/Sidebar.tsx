import { useTranslation } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Copy, FileText, FileUp, LayoutTemplate, MoreHorizontal, NotebookPen, Pencil, Plus, Search, Settings, Trash2 } from "lucide-react";
import { version } from "../../package.json";
import type { WorkspaceEntry } from "../workspace/workspace";

interface SidebarEntry extends WorkspaceEntry {
  title: string;
}

export interface SidebarProps {
  entries: readonly SidebarEntry[];
  activeEntry: WorkspaceEntry | null;
  onCreate: (kind: WorkspaceEntry["kind"]) => void;
  onOpen: (entry: WorkspaceEntry) => void;
  onRename: (entry: WorkspaceEntry, title: string) => void;
  onDuplicateCanvas: (id: string) => void;
  onDelete: (entry: WorkspaceEntry) => void;
  onShowUpdates: () => void;
  onShowSettings: () => void;
  onImportMarkdown?: (file: File) => void;
  onSearch?: () => void;
}

const sections = [
  { kind: "note", label: "笔记", createLabel: "新建笔记", untitled: "未命名笔记", icon: FileText },
  { kind: "canvas", label: "画布", createLabel: "新建画布", untitled: "未命名画布", icon: LayoutTemplate },
] as const;

export function Sidebar({
  entries, activeEntry, onCreate, onOpen, onRename, onDuplicateCanvas, onDelete, onShowUpdates, onShowSettings, onImportMarkdown, onSearch,
}: SidebarProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<string | null>(null);
  const [menuAbove, setMenuAbove] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const aside = useRef<HTMLElement>(null);
  const markdownInput = useRef<HTMLInputElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menu) return;
    function dismiss(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest("[data-sidebar-menu]")
        || !aside.current?.contains(event.target)) setMenu(null);
    }
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [menu]);

  useEffect(() => {
    if (!renaming) return;
    function finishOnOutsideClick(event: PointerEvent) {
      const input = renameInput.current;
      if (event.button === 0 && input && event.target !== input) input.blur();
    }
    window.addEventListener("pointerdown", finishOnOutsideClick, true);
    return () => window.removeEventListener("pointerdown", finishOnOutsideClick, true);
  }, [renaming]);

  return <aside className="sidebar" ref={aside} aria-label={t("工作区文件")}
    onKeyDown={(event) => { if (event.key === "Escape") setMenu(null); }}>
    <div className="brand">
      <span className="brand-mark"><NotebookPen size={21} strokeWidth={1.65} /></span>
      <div><div className="brand-name">{t("墨栈")}</div><div className="brand-subtitle">{t("品牌副标题", { defaultValue: "Inkbench" })}</div></div>
    </div>
    <div className="sidebar-create" data-sidebar-menu>
      <button type="button" className="create-button" aria-expanded={menu === "create"} onClick={() => {
        setMenu(menu === "create" ? null : "create");
      }}><Plus size={18} /><span>{t("新建")}</span><ChevronDown size={14} className="create-chevron" /></button>
      {menu === "create" && <div className="sidebar-menu">
        {sections.map(({ kind, createLabel, icon: Icon }) => <button type="button" key={kind} onClick={() => {
          setMenu(null);
          onCreate(kind);
        }}><Icon size={16} />{t(createLabel)}</button>)}
        <button type="button" disabled={!onImportMarkdown} onClick={() => {
          setMenu(null);
          markdownInput.current?.click();
        }}><FileUp size={16} />{t("导入 Markdown")}</button>
      </div>}
      <input ref={markdownInput} type="file" hidden aria-label={t("选择 Markdown 笔记文件")}
        accept=".md,.markdown,text/markdown" onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          input.value = "";
          if (file) onImportMarkdown?.(file);
        }} />
    </div>
    <button type="button" className="sidebar-search" title={t("搜索工作区（Ctrl+K）")} aria-haspopup="dialog"
      disabled={!onSearch} onClick={() => { setMenu(null); onSearch?.(); }}>
      <Search size={15} /><span>{t("搜索工作区")}</span><kbd>Ctrl K</kbd>
    </button>
    <nav className="file-list" aria-label={t("笔记和画布")}>
      {sections.map(({ kind, label, createLabel, untitled, icon: Icon }) => (
        <section className="file-section" key={kind}>
          <div className="file-section-heading">
            <h2>{t(label)}</h2>
            <button type="button" className="icon-button section-add" aria-label={t(createLabel)} title={t(createLabel)}
              onClick={() => { setMenu(null); onCreate(kind); }}><Plus size={15} /></button>
          </div>
          {entries.filter((entry) => entry.kind === kind).map((entry) => {
            const active = activeEntry?.id === entry.id && activeEntry.kind === entry.kind;
            const title = entry.title || t(untitled);
            return <div className={`file-row${active ? " is-active" : ""}`} key={entry.id}>
              {renaming === entry.id ? <div className="file-rename">
                <Icon size={16} />
                <input ref={renameInput} aria-label={t("新名称")} defaultValue={title} autoFocus
                  onFocus={(event) => event.currentTarget.select()} onBlur={(event) => {
                    const nextTitle = event.currentTarget.value.trim();
                    if (nextTitle && nextTitle !== title) onRename(entry, nextTitle);
                    setRenaming(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || (event.key !== "Enter" && event.key !== "Escape")) return;
                    event.preventDefault();
                    if (event.key === "Escape") event.currentTarget.value = title;
                    event.currentTarget.blur();
                  }} />
              </div>
                : <>
                  <button className="file-open" type="button" aria-current={active ? "page" : undefined} title={title}
                    onClick={() => { setMenu(null); onOpen(entry); }}><Icon size={16} /><span>{title}</span></button>
                  <div className="file-options" data-sidebar-menu>
                    <button type="button" className="icon-button file-options-button" aria-label={t("{{title}}的选项", { title })}
                      aria-expanded={menu === entry.id} onClick={(event) => {
                        const row = event.currentTarget.getBoundingClientRect();
                        const region = event.currentTarget.closest(".file-list")?.getBoundingClientRect();
                        setMenuAbove(Boolean(region && region.bottom - row.bottom < 115 && row.top - region.top > 115));
                        setMenu(menu === entry.id ? null : entry.id);
                      }}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menu === entry.id && <div className={`sidebar-menu row-menu${menuAbove ? " is-above" : ""}`}>
                      <button type="button" onClick={() => { setMenu(null); setRenaming(entry.id); }}><Pencil size={15} />{t("重命名")}</button>
                      {kind === "canvas" && <button type="button" onClick={() => { setMenu(null); onDuplicateCanvas(entry.id); }}>
                        <Copy size={15} />{t("复制画布")}</button>}
                      <button type="button" className="destructive-text" onClick={() => { setMenu(null); onDelete(entry); }}>
                        <Trash2 size={15} />{t("删除")}
                      </button>
                    </div>}
                  </div>
                </>}
            </div>;
          })}
        </section>
      ))}
    </nav>
    <footer className="sidebar-footer">
      <div className="sidebar-footer-actions">
        <button type="button" className="sidebar-updates" aria-haspopup="dialog" onClick={onShowUpdates}>
          <Bell size={15} />
          <span>{t("更新公告")}</span>
          <span className="sidebar-version">v{version}</span>
        </button>
        <button type="button" className="icon-button sidebar-settings" title={t("设置")} aria-label={t("设置")}
          aria-haspopup="dialog" onClick={onShowSettings}><Settings size={16} /></button>
      </div>
      <div className="sidebar-local"><span className="local-indicator" />{t("本地工作区")}</div>
    </footer>
  </aside>;
}
