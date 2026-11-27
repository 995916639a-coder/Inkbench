import type { ReactElement } from "react";
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
  onDelete: (entry: WorkspaceEntry) => void;
}

export declare function Sidebar(props: SidebarProps): ReactElement;
