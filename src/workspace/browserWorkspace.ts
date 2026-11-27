import type { Workspace, WorkspaceStorage } from "./workspace";

export function createBrowserWorkspaceStorage(): WorkspaceStorage {
  let workspace: Workspace | null = null;
  return {
    async loadWorkspace() { return workspace; },
    async saveWorkspace(nextWorkspace) { workspace = nextWorkspace; },
  };
}
