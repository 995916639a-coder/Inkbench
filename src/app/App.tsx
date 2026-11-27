import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, CircleAlert, Focus, LayoutGrid, NotebookText, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { duplicateCanvas } from "../function/canvas-duplicate";
import { createNote } from "../function/documents";
import { importMarkdownFile } from "../function/markdown-import";
import { CanvasView } from "../views/canvas/CanvasView";
import { NotesView } from "../views/notes/NotesView";
import { WorkspaceSearchDialog } from "../views/search/WorkspaceSearchDialog";
import { UpdatesDialog } from "../views/updates/UpdatesDialog";
import { createSampleWorkspace } from "../workspace/sampleWorkspace";
import { createCanvas } from "../workspace/workspace";
import type { Workspace, WorkspaceEntry, WorkspaceStorage } from "../workspace/workspace";
import { Sidebar } from "./Sidebar";

export interface AppProps {
  storage: WorkspaceStorage;
  isPreview?: boolean;
  toggleFullscreen?: () => Promise<boolean>;
}

type SaveStatus = "saved" | "saving" | "failed";

export function App({ storage, isPreview = false, toggleFullscreen }: AppProps) {
  const current = useRef<Workspace | null>(null);
  const saveNumber = useRef(0);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [entryToDelete, setEntryToDelete] = useState<WorkspaceEntry | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
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
        || !current.current || updatesOpen || entryToDelete) return;
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
  }, [updatesOpen, entryToDelete, toggleSidebar]);

  function update(edit: (workspace: Workspace) => Workspace) {
    if (current.current) save(edit(current.current));
  }

  function createEntry(kind: WorkspaceEntry["kind"]) {
    const id = crypto.randomUUID();
    update((previous) => kind === "note"
      ? { ...previous, activeEntry: { kind, id }, notes: [...previous.notes, createNote(id)] }
      : { ...previous, activeEntry: { kind, id }, canvases: [...previous.canvases, createCanvas(id)] });
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
    const copy = duplicateCanvas(source, workspace.canvases.map((canvas) => canvas.title));
    save({ ...workspace, canvases: [...workspace.canvases, copy], activeEntry: { kind: "canvas", id: copy.id } });
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
  const title = canvas ? canvas.title || "未命名画布" : note ? note.title || "未命名笔记" : null;
  const sidebarCollapsed = Boolean(workspace?.sidebarCollapsed);
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;
  const sidebarAction = sidebarCollapsed ? "展开侧栏" : "收起侧栏";
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
        onShowUpdates={() => setUpdatesOpen(true)}
        onImportMarkdown={workspace && !importing ? importNote : undefined}
        onSearch={workspace ? () => setSearchOpen(true) : undefined}
      />}
      <main className="workbench">
        <header className="workbench-header">
          <div className="workbench-location">
            <button type="button" className="icon-button sidebar-toggle" aria-label={sidebarAction} title={sidebarAction}
              aria-expanded={!sidebarCollapsed} disabled={!workspace} onClick={toggleSidebar}><SidebarIcon size={17} /></button>
            <nav className="breadcrumbs" aria-label="当前位置">
              <span className="breadcrumb-home"><LayoutGrid size={15} /> 工作区</span>
              {title && <><ChevronRight size={14} /><span title={title}>{title}</span></>}
            </nav>
          </div>
          <div className="workbench-actions">
            {workspace && (saveStatus === "failed" ? (
              <button type="button" className="save-status failed" onClick={() => { if (current.current) save(current.current); }}>
                <CircleAlert size={14} /> 保存失败，重试
              </button>
            ) : (
              <span className="save-status" role="status">
                <span className="save-dot"><Check size={9} strokeWidth={2.6} /></span>
                {isPreview ? "预览模式" : saveStatus === "saving" ? "正在保存" : "已本地保存"}
              </span>
            ))}
            {toggleFullscreen && <button type="button" className="icon-button fullscreen-button" title="切换全屏（F11）"
              aria-label="切换全屏" onClick={() => {
                setAlert(null);
                void toggleFullscreen().catch(() => setAlert("无法切换全屏"));
              }}><Focus size={18} /></button>}
          </div>
        </header>
        {alert && <div className="workbench-alert" role="alert">
          {alert} <button className="icon-button" aria-label="关闭提示" onClick={() => setAlert(null)}><X size={15} /></button>
        </div>}
        {canvas ? <CanvasView key={canvas.id} canvas={canvas} notes={workspace?.notes ?? []}
          revealNode={canvasNode?.canvasId === canvas.id ? canvasNode : undefined}
          onChange={(changed) => update((previous) => ({
            ...previous, canvases: previous.canvases.map((item) => item.id === changed.id ? changed : item),
          }))} />
          : note ? <NotesView key={note.id} note={note} onChange={(changed) => update((previous) => ({
            ...previous, notes: previous.notes.map((item) => item.id === changed.id ? changed : item),
          }))} />
            : <div className="workspace-empty">
              <span className="empty-symbol"><NotebookText size={28} strokeWidth={1.6} /></span>
              <h1>{loadFailed ? "无法打开工作区" : workspace ? "开始记录" : "正在打开工作区"}</h1>
              {loadFailed && <button className="secondary-button" onClick={() => {
                setLoadFailed(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}>重试</button>}
              {workspace && <div className="empty-actions">
                <button className="primary-button" onClick={() => createEntry("note")}>新建笔记</button>
                <button className="secondary-button" onClick={() => createEntry("canvas")}>新建画布</button>
              </div>}
            </div>}
      </main>
      {searchOpen && workspace && <WorkspaceSearchDialog workspace={workspace} onClose={() => setSearchOpen(false)}
        onOpenResult={({ entry, nodeId }) => {
          setCanvasNode(nodeId ? { canvasId: entry.id, nodeId } : null);
          update((previous) => ({ ...previous, activeEntry: entry }));
        }} />}
      {updatesOpen && <UpdatesDialog onClose={() => setUpdatesOpen(false)} />}
      {entryToDelete && <div className="dialog-backdrop" onClick={() => setEntryToDelete(null)}>
        <form role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="dialog"
          onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            deleteEntry(entryToDelete);
          }} onKeyDown={(event) => { if (event.key === "Escape") setEntryToDelete(null); }}>
          <h2 id="delete-title">删除{entryToDelete.kind === "note" ? "笔记" : "画布"}</h2>
          <p>将从工作区删除「{removeTitle || "未命名"}」。</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" autoFocus onClick={() => setEntryToDelete(null)}>取消</button>
            <button type="submit" className="danger-button">删除</button>
          </div>
        </form>
      </div>}
    </div>
  );
}
