import { useEffect, useRef, useState } from "react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Bold, Code2, Link2, List, ListOrdered, SquareCode } from "lucide-react";
import { common, createLowlight } from "lowlight";
import type { DocumentContent } from "../function/documents";
import "./editor.css";

export interface RichTextEditorProps {
  content: DocumentContent;
  onChange: (content: DocumentContent) => void;
  editable?: boolean;
}

const extensions = [
  StarterKit.configure({
    codeBlock: false,
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
  }),
  CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
  Placeholder.configure({ placeholder: "开始写笔记…" }),
];

const languages = [
  ["", "自动检测"], ["plaintext", "纯文本"], ["typescript", "TypeScript"],
  ["javascript", "JavaScript"], ["python", "Python"], ["json", "JSON"], ["bash", "Bash"],
  ["cpp", "C++"], ["rust", "Rust"], ["go", "Go"], ["sql", "SQL"], ["xml", "HTML / XML"],
];

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const [editingLink, setEditingLink] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const currentContent = useRef(content);
  const editor = useEditor({
    extensions,
    content,
    editable,
    editorProps: { attributes: { "aria-label": "笔记正文", spellcheck: "false" } },
    onUpdate: ({ editor }) => {
      const next = editor.getJSON() as DocumentContent;
      currentContent.current = next;
      onChange(next);
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading: [1, 2, 3].find((level) => editor?.isActive("heading", { level })) ?? 0,
      bold: editor?.isActive("bold") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      code: editor?.isActive("code") ?? false,
      codeBlock: editor?.isActive("codeBlock") ?? false,
      language: String(editor?.getAttributes("codeBlock").language ?? ""),
      link: editor?.isActive("link") ?? false,
    }),
  });

  useEffect(() => { editor?.setEditable(editable, false); }, [editor, editable]);
  useEffect(() => {
    if (!editor || currentContent.current === content) return;
    currentContent.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  const tools = [
    { name: "粗体", icon: Bold, active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { name: "无序列表", icon: List, active: state?.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { name: "有序列表", icon: ListOrdered, active: state?.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { name: "行内代码", icon: Code2, active: state?.code, run: () => editor.chain().focus().toggleCode().run() },
    { name: "代码块", icon: SquareCode, active: state?.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ];

  return <div className={`rich-text${editable ? " is-editable" : ""}`}>
    {editable && <div className="editor-toolbar" aria-label="文本格式工具">
      <select className="editor-select" aria-label="段落格式" value={state?.heading ?? 0} onChange={(event) => {
        const level = Number(event.currentTarget.value);
        if (level === 1 || level === 2 || level === 3) editor.chain().focus().setHeading({ level }).run();
        else editor.chain().focus().setParagraph().run();
      }}>
        <option value={0}>正文</option>
        <option value={1}>标题 1</option>
        <option value={2}>标题 2</option>
        <option value={3}>标题 3</option>
      </select>
      <span className="editor-divider" />
      {tools.map(({ name, icon: Icon, active, run }) => (
        <button type="button" key={name} className="icon-button editor-tool" title={name} aria-label={name}
          aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={run}>
          <Icon size={16} />
        </button>
      ))}
      <div className="editor-link">
        <button type="button" className="icon-button editor-tool" title="链接" aria-label="链接"
          aria-pressed={state?.link} aria-expanded={editingLink} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { setInvalidLink(false); setEditingLink(!editingLink); }}>
          <Link2 size={16} />
        </button>
        {editingLink && <form className="link-form" onSubmit={(event) => {
          event.preventDefault();
          const address = String(new FormData(event.currentTarget).get("address") ?? "").trim();
          const chain = editor.chain().focus().extendMarkRange("link");
          if (address && !chain.setLink({ href: address }).run()) {
            setInvalidLink(true);
            return;
          }
          if (!address) chain.unsetLink().run();
          setEditingLink(false);
        }} onKeyDown={(event) => {
          if (event.key === "Escape") { setEditingLink(false); editor.commands.focus(); }
        }}>
          <input name="address" aria-label="链接地址" placeholder="https://…" autoFocus
            defaultValue={String(editor.getAttributes("link").href ?? "")}
            onChange={() => setInvalidLink(false)} />
          <button className="primary-button" type="submit">应用</button>
          {invalidLink && <span role="alert">链接地址无效</span>}
        </form>}
      </div>
      {state?.codeBlock && <select className="editor-select" aria-label="代码语言" value={state.language}
        onChange={(event) => editor.chain().focus().updateAttributes("codeBlock", {
          language: event.currentTarget.value || null,
        }).run()}>
        {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>}
    </div>}
    <EditorContent editor={editor} />
  </div>;
}
