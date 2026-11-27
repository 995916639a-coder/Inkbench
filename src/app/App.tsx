import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, CircleAlert, LayoutGrid, Maximize, NotebookText, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { duplicateCanvas } from "../function/canvas-duplicate";
import { createNote } from "../function/documents";
import { importMarkdownFile } from "../function/markdown-import";
import type { MindMap } from "../function/mind-map";
import { applyNoteTranslation, switchNoteTranslation } from "../function/note-translation";
import { CanvasView } from "../views/canvas/CanvasView";
import { NotesView } from "../views/notes/NotesView";
import { WorkspaceSearchDialog } from "../views/search/WorkspaceSearchDialog";
import { SettingsDialog } from "../views/settings/SettingsDialog";
import { TranslationDialog } from "../views/translation/TranslationDialog";
import type { TranslationSource } from "../views/translation/TranslationDialog";
import { UpdatesDialog } from "../views/updates/UpdatesDialog";
import { useTranslation } from "../i18n";
import type { TranslationDirection } from "../function/note-translation";
import type { DesktopTranslation, WindowZoom } from "../workspace/desktopWorkspace";
import { createSampleWorkspace } from "../workspace/sampleWorkspace";
import { createCanvas } from "../workspace/workspace";
import type { Workspace, WorkspaceEntry, WorkspaceStorage } from "../workspace/workspace";
import { Sidebar } from "./Sidebar";

export interface AppProps {
  storage: WorkspaceStorage;
  isPreview?: boolean;
  toggleMaximized?: () => Promise<void>;
  windowZoom?: WindowZoom;
  translation?: DesktopTranslation;
}

type SaveStatus = "saved" | "saving" | "failed";
type TranslationRequest = TranslationSource & { replaceMap?: (map: MindMap, direction: TranslationDirection) => boolean };

export function App({ storage, isPreview = false, toggleMaximized, windowZoom, translation }: AppProps) {
  const { t } = useTranslation();
  const current = useRef<Workspace | null>(null);
  const saveNumber = useRef(0);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [entryToDelete, setEntryToDelete] = useState<WorkspaceEntry | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [sidebarDialog, setSidebarDialog] = useState<"updates" | "settings" | null>(null);
  const [translationSource, setTranslationSource] = useState<TranslationRequest | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [canvasNode, setCanvasNode] = useState<{ canvasId: string; nodeId: string } | null>(null);

  const save = useCallback((next: Workspace) => {
    current.current = next;
    setWorkspace(next);
    setSaveStatus("saving");
    const number = ++saveNumber.current;
    void storage.saveWorkspace(next).then(
      () => { if (number === saveNumber.current) setSaveStatus("saved"); },
      () => { if (number === saveNumber.current) setSaveStatus("failed"); },
    );
  }, [storage]);

  const toggleSidebar = useCallback(() => {
    const workspace = current.current;
    if (workspace) save({ ...workspace, sidebarCollapsed: !workspace.sidebarCollapsed });
  }, [save]);

  useEffect(() => {
    let active = true;
    void storage.loadWorkspace().then((existing) => {
      if (!active) return;
      if (existing) {
        current.current = existing;
        setWorkspace(existing);
      } else {
        save(createSampleWorkspace());
      }
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [storage, save, loadAttempt]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.isComposing
        || !current.current || sidebarDialog || translationSource || entryToDelete) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if ((event.key === "\\" || event.code === "Backslash") && !document.querySelector("dialog:modal") && !event.repeat) {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [sidebarDialog, translationSource, entryToDelete, toggleSidebar]);

  function update(edit: (workspace: Workspace) => Workspace) {
    if (current.current) save(edit(current.current));
  }

  function createEntry(kind: WorkspaceEntry["kind"]) {
    const id = crypto.randomUUID();
    update((previous) => kind === "note"
      ? { ...previous, activeEntry: { kind, id }, notes: [...previous.notes, createNote(id, "")] }
      : { ...previous, activeEntry: { kind, id }, canvases: [...previous.canvases, createCanvas(id, "")] });
  }

  async function importNote(file: File) {
    setAlert(null);
    setImporting(true);
    try {
      const note = { id: crypto.randomUUID(), ...await importMarkdownFile(file) };
      update((previous) => ({
        ...previous,
        notes: [...previous.notes, note],
        activeEntry: { kind: "note", id: note.id },
      }));
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "无法导入 Markdown 文件。");
    } finally {
      setImporting(false);
    }
  }

  function renameEntry(entry: WorkspaceEntry, title: string) {
    update((previous) => entry.kind === "note"
      ? { ...previous, notes: previous.notes.map((note) => note.id === entry.id ? { ...note, title } : note) }
      : { ...previous, canvases: previous.canvases.map((canvas) => canvas.id === entry.id ? { ...canvas, title } : canvas) });
  }

  function copyCanvas(id: string) {
    const workspace = current.current;
    const source = workspace?.canvases.find((canvas) => canvas.id === id);
    if (!workspace || !source) return;
    const copy = duplicateCanvas(source, workspace.canvases.map((canvas) => canvas.title), undefined,
      t("{{title}} 副本", { title: source.title.trim() || t("未命名画布") }));
    save({ ...workspace, canvases: [...workspace.canvases, copy], activeEntry: { kind: "canvas", id: copy.id } });
  }

  function applyTranslation(result: TranslationSource, direction: TranslationDirection): boolean {
    const source = translationSource;
    const workspace = current.current;
    if (!workspace || !source) return false;

    if (source.kind === "note" && result.kind === "note") {
      const note = workspace.notes.find(({ id }) => id === source.note.id);
      if (!note || note.title !== source.note.title || note.content !== source.note.content) return false;
      const translated = applyNoteTranslation(note, result.note, direction);
      save({ ...workspace, notes: workspace.notes.map((item) => item === note ? translated : item) });
    } else if (source.kind === "canvas" && result.kind === "canvas") {
      if (!result.canvas.mindMap || !source.replaceMap?.(result.canvas.mindMap, direction)) return false;
    } else {
      return false;
    }
    setTranslationSource(null);
    return true;
  }

  function deleteEntry(entry: WorkspaceEntry) {
    update((previous) => {
      const notes = entry.kind === "note" ? previous.notes.filter(({ id }) => id !== entry.id) : previous.notes;
      const canvases = entry.kind === "canvas" ? previous.canvases.filter(({ id }) => id !== entry.id) : previous.canvases;
      let activeEntry = previous.activeEntry;
      if (activeEntry?.kind === entry.kind && activeEntry.id === entry.id) {
        activeEntry = canvases[0] ? { kind: "canvas", id: canvases[0].id }
          : notes[0] ? { kind: "note", id: notes[0].id } : null;
      }
      return { ...previous, notes, canvases, activeEntry };
    });
    setEntryToDelete(null);
  }

  const activeEntry = workspace?.activeEntry;
  const note = activeEntry?.kind === "note" ? workspace?.notes.find(({ id }) => id === activeEntry.id) : undefined;
  const canvas = activeEntry?.kind === "canvas" ? workspace?.canvases.find(({ id }) => id === activeEntry.id) : undefined;
  const entries = [
    ...(workspace?.notes ?? []).map(({ id, title }) => ({ id, title, kind: "note" as const })),
    ...(workspace?.canvases ?? []).map(({ id, title }) => ({ id, title, kind: "canvas" as const })),
  ];
  const title = canvas ? canvas.title || t("未命名画布") : note ? note.title || t("未命名笔记") : null;
  const sidebarCollapsed = Boolean(workspace?.sidebarCollapsed);
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;
  const sidebarAction = sidebarCollapsed ? t("展开侧栏") : t("收起侧栏");
  const removeTitle = entries.find((entry) => entry.id === entryToDelete?.id && entry.kind === entryToDelete.kind)?.title;

  return (
    <div className={`app-shell${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      {!sidebarCollapsed && <Sidebar
        entries={entries}
        activeEntry={activeEntry ?? null}
        onCreate={createEntry}
        onOpen={(entry) => {
          setCanvasNode(null);
          update((previous) => ({ ...previous, activeEntry: entry }));
        }}
        onRename={renameEntry}
        onDuplicateCanvas={copyCanvas}
        onDelete={setEntryToDelete}
        onShowUpdates={() => setSidebarDialog("updates")}
        onShowSettings={() => setSidebarDialog("settings")}
        onImportMarkdown={workspace && !importing ? importNote : undefined}
        onSearch={workspace ? () => setSearchOpen(true) : undefined}
      />}
      <main className="workbench">
        <header className="workbench-header">
          <div className="workbench-location">
            <button type="button" className="icon-button sidebar-toggle" aria-label={sidebarAction} title={sidebarAction}
              aria-expanded={!sidebarCollapsed} disabled={!workspace} onClick={toggleSidebar}><SidebarIcon size={17} /></button>
            <nav className="breadcrumbs" aria-label={t("当前位置")}>
              <span className="breadcrumb-home"><LayoutGrid size={15} />{t("工作区")}</span>
              {title && <><ChevronRight size={14} /><span title={title}>{title}</span></>}
            </nav>
          </div>
          <div className="workbench-actions">
            {workspace && (saveStatus === "failed" ? (
              <button type="button" className="save-status failed" onClick={() => { if (current.current) save(current.current); }}>
                <CircleAlert size={14} />{t("保存失败，重试")}</button>
            ) : (
              <span className="save-status" role="status">
                <span className="save-dot"><Check size={9} strokeWidth={2.6} /></span>
                {isPreview ? t("预览模式") : saveStatus === "saving" ? t("正在保存") : t("已本地保存")}
              </span>
            ))}
            {toggleMaximized && <button type="button" className="icon-button window-size-button" title={t("最大化或还原窗口（F11）")}
              aria-label={t("最大化或还原窗口")} onClick={() => {
                setAlert(null);
                void toggleMaximized().catch(() => setAlert("无法调整窗口大小"));
              }}><Maximize size={17} /></button>}
          </div>
        </header>
        {alert && <div className="workbench-alert" role="alert">
          {t(alert)} <button className="icon-button" aria-label={t("关闭提示")} onClick={() => setAlert(null)}><X size={15} /></button>
        </div>}
        {canvas ? <CanvasView key={canvas.id} canvas={canvas} notes={workspace?.notes ?? []}
          revealNode={canvasNode?.canvasId === canvas.id ? canvasNode : undefined}
          onTranslate={translation ? (canvas, replaceMap) => setTranslationSource({ kind: "canvas", canvas, replaceMap }) : undefined}
          onChange={(changed) => update((previous) => ({
            ...previous, canvases: previous.canvases.map((item) => item.id === changed.id ? changed : item),
          }))} />
          : note ? <NotesView key={note.id} note={note}
            onTranslate={note.translation ? () => update((previous) => ({
              ...previous, notes: previous.notes.map((item) => item.id === note.id ? switchNoteTranslation(item) : item),
            })) : translation ? () => setTranslationSource({ kind: "note", note }) : undefined}
            onChange={(changed) => update((previous) => ({
            ...previous, notes: previous.notes.map((item) => item.id === changed.id ? changed : item),
          }))} />
            : <div className="workspace-empty">
              <span className="empty-symbol"><NotebookText size={28} strokeWidth={1.6} /></span>
              <h1>{loadFailed ? t("无法打开工作区") : workspace ? t("开始记录") : t("正在打开工作区")}</h1>
              {loadFailed && <button className="secondary-button" onClick={() => {
                setLoadFailed(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}>{t("重试")}</button>}
              {workspace && <div className="empty-actions">
                <button className="primary-button" onClick={() => createEntry("note")}>{t("新建笔记")}</button>
                <button className="secondary-button" onClick={() => createEntry("canvas")}>{t("新建画布")}</button>
              </div>}
            </div>}
      </main>
      {searchOpen && workspace && <WorkspaceSearchDialog workspace={workspace} onClose={() => setSearchOpen(false)}
        onOpenResult={({ entry, nodeId }) => {
          setCanvasNode(nodeId ? { canvasId: entry.id, nodeId } : null);
          update((previous) => ({ ...previous, activeEntry: entry }));
        }} />}
      {sidebarDialog === "updates" && <UpdatesDialog onClose={() => setSidebarDialog(null)} />}
      {sidebarDialog === "settings" && <SettingsDialog zoom={windowZoom} onClose={() => setSidebarDialog(null)} />}
      {translationSource && translation && <TranslationDialog source={translationSource} engine={translation}
        onApply={applyTranslation} onClose={() => setTranslationSource(null)} />}
      {entryToDelete && <div className="dialog-backdrop" onClick={() => setEntryToDelete(null)}>
        <form role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="dialog"
          onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            deleteEntry(entryToDelete);
          }} onKeyDown={(event) => { if (event.key === "Escape") setEntryToDelete(null); }}>
          <h2 id="delete-title">{t(entryToDelete.kind === "note" ? "删除笔记" : "删除画布")}</h2>
          <p>{t("将从工作区删除「{{title}}」。", { title: removeTitle || t("未命名") })}</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" autoFocus onClick={() => setEntryToDelete(null)}>{t("取消")}</button>
            <button type="submit" className="danger-button">{t("删除")}</button>
          </div>
        </form>
      </div>}
    </div>
  );
}
