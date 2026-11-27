import type { ReactElement } from "react";
import type { Note } from "../../function/documents";
import type { CanvasDocument } from "../../workspace/workspace";

export interface CanvasViewProps {
  canvas: CanvasDocument;
  notes: readonly Note[];
  onChange: (canvas: CanvasDocument) => void;
}

export declare function CanvasView(props: CanvasViewProps): ReactElement;
