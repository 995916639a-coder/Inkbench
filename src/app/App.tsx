import type { ReactElement } from "react";
import type { WorkspaceStorage } from "../workspace/workspace";

export interface AppProps {
  storage: WorkspaceStorage;
  toggleFullscreen?: () => Promise<boolean>;
}

export declare function App(props: AppProps): ReactElement;
