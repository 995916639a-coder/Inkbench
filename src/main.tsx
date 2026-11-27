import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./app/app.css";
import { App } from "./app/App";
import { createBrowserWorkspaceStorage } from "./workspace/browserWorkspace";

const root = document.getElementById("root");
if (!root) throw new Error("Inkbench root is missing");

const bridge = window.inkbench;

createRoot(root).render(
  <App
    storage={bridge ?? createBrowserWorkspaceStorage()}
    isPreview={!bridge}
    toggleMaximized={bridge?.toggleMaximized}
  />,
);
