import type { ReactElement } from "react";
import type { Note } from "../../function/documents";

export interface NotesViewProps {
  note: Note;
  onChange: (note: Note) => void;
}

export declare function NotesView(props: NotesViewProps): ReactElement;
