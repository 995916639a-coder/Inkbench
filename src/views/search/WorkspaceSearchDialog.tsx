import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, LayoutTemplate, Search, X } from "lucide-react";
import { searchWorkspace } from "../../function/workspace-search";
import type { WorkspaceSearchResult } from "../../function/workspace-search";
import type { Workspace } from "../../workspace/workspace";
import "./search.css";

interface WorkspaceSearchDialogProps {
  workspace: Workspace;
  onOpenResult: (result: WorkspaceSearchResult) => void;
  onClose: () => void;
}

export function WorkspaceSearchDialog({ workspace, onOpenResult, onClose }: WorkspaceSearchDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const results = useMemo(() => searchWorkspace(workspace, query), [workspace, query]);

  useEffect(() => { dialog.current?.showModal(); }, []);

  function openResult(result: WorkspaceSearchResult) {
    dialog.current?.close();
    onOpenResult(result);
  }

  return <dialog ref={dialog} className="workspace-search-dialog" aria-label="搜索工作区" onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="workspace-search-header">
      <Search size={18} aria-hidden="true" />
      <input type="text" placeholder="搜索标题、正文或导图节点" role="combobox" aria-label="搜索工作区" aria-expanded="true"
        aria-autocomplete="list" aria-controls="workspace-search-results"
        aria-activedescendant={results[highlighted] ? `workspace-search-${highlighted}` : undefined}
        value={query} autoFocus onChange={(event) => {
          setQuery(event.currentTarget.value);
          setHighlighted(0);
          list.current?.scrollTo({ top: 0 });
        }} onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || !results.length) return;
          if (event.key === "Enter" && results[highlighted]) {
            event.preventDefault();
            openResult(results[highlighted]);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const next = (highlighted + direction + results.length) % results.length;
            setHighlighted(next);
            list.current?.children[next]?.scrollIntoView({ block: "nearest" });
          }
        }} />
      <button className="icon-button" type="button" aria-label="关闭搜索" onClick={() => dialog.current?.close()}><X size={17} /></button>
    </div>
    <div id="workspace-search-results" className="workspace-search-results" role="listbox" aria-label="搜索结果" ref={list}>
      {results.map((result, index) => {
        const Icon = result.entry.kind === "note" ? FileText : LayoutTemplate;
        return <div key={result.entry.id} id={`workspace-search-${index}`} role="option" aria-selected={index === highlighted}
          onMouseMove={() => setHighlighted(index)} onClick={() => openResult(result)}>
          <Icon size={17} />
          <div><strong>{result.title}</strong>{result.excerpt && <small>{result.excerpt}</small>}</div>
        </div>;
      })}
      {!results.length && <p role="status">{query.trim() ? "找不到相关内容" : "工作区为空"}</p>}
    </div>
  </dialog>;
}
