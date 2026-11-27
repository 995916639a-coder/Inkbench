import type { ReactElement } from "react";
import type { DocumentContent } from "../function/documents";

export interface RichTextEditorProps {
  content: DocumentContent;
  onChange: (content: DocumentContent) => void;
}

export declare function RichTextEditor(props: RichTextEditorProps): ReactElement;
