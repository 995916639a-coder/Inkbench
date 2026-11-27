import { useEffect, useRef, useState } from "react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Bold, Code2, Link2, List, ListOrdered, SquareCode } from "lucide-react";
import { common, createLowlight } from "lowlight";
import type { DocumentContent } from "../function/documents";
import { interfaceText, useTranslation } from "../i18n";
import "./editor.css";

export interface RichTextEditorProps {
  content: DocumentContent;
  onChange?: (content: DocumentContent) => void;
  editable?: boolean;
}

const extensions = [
  StarterKit.configure({
    codeBlock: false,
    link: { openOnClick: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
  }),
  CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
  Placeholder.configure({ placeholder: () => interfaceText("开始写笔记…") }),
];

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

const languages = [
  ["", "自动检测"], ["plaintext", "纯文本"], ["typescript", "TypeScript"],
  ["javascript", "JavaScript"], ["python", "Python"], ["json", "JSON"], ["bash", "Bash"],
  ["cpp", "C++"], ["rust", "Rust"], ["go", "Go"], ["sql", "SQL"], ["xml", "HTML / XML"],
];

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const { t } = useTranslation();
  const bodyLabel = t("笔记正文");
  const [editingLink, setEditingLink] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const currentContent = useRef(content);
  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => {
      const next = editor.getJSON() as DocumentContent;
      currentContent.current = next;
      onChange?.(next);
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading: headingLevels.find((level) => editor?.isActive("heading", { level })) ?? 0,
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
    editor?.setOptions({ editorProps: { attributes: { "aria-label": bodyLabel, spellcheck: "false" } } });
  }, [editor, bodyLabel]);
  useEffect(() => {
    if (!editor || currentContent.current === content) return;
    currentContent.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  const tools = [
    { name: t("粗体"), icon: Bold, active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { name: t("无序列表"), icon: List, active: state?.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { name: t("有序列表"), icon: ListOrdered, active: state?.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { name: t("行内代码"), icon: Code2, active: state?.code, run: () => editor.chain().focus().toggleCode().run() },
    { name: t("代码块"), icon: SquareCode, active: state?.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ];

  return <div className={`rich-text${editable ? " is-editable" : ""}`}>
    {editable && <div className="editor-toolbar" aria-label={t("文本格式工具")}>
      <select className="editor-select" aria-label={t("段落格式")} value={state?.heading ?? 0} onChange={(event) => {
        const level = headingLevels.find((level) => String(level) === event.currentTarget.value);
        if (level) editor.chain().focus().setHeading({ level }).run();
        else editor.chain().focus().setParagraph().run();
      }}>
        <option value={0}>{t("正文")}</option>
        {headingLevels.map((level) => <option key={level} value={level}>{t("标题 {{level}}", { level })}</option>)}
      </select>
      <span className="editor-divider" />
      {tools.map(({ name, icon: Icon, active, run }) => (
        <button type="button" key={name} className="icon-button editor-tool" title={name} aria-label={name}
          aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={run}>
          <Icon size={16} />
        </button>
      ))}
      <div className="editor-link">
        <button type="button" className="icon-button editor-tool" title={t("链接")} aria-label={t("链接")}
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
          <input name="address" aria-label={t("链接地址")} placeholder="https://…" autoFocus
            defaultValue={String(editor.getAttributes("link").href ?? "")}
            onChange={() => setInvalidLink(false)} />
          <button className="primary-button" type="submit">{t("应用")}</button>
          {invalidLink && <span role="alert">{t("链接地址无效")}</span>}
        </form>}
      </div>
      {state?.codeBlock && <select className="editor-select" aria-label={t("代码语言")} value={state.language}
        onChange={(event) => editor.chain().focus().updateAttributes("codeBlock", {
          language: event.currentTarget.value || null,
        }).run()}>
        {languages.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        {state.language && !languages.some(([value]) => value === state.language)
          && <option value={state.language}>{state.language}</option>}
      </select>}
    </div>}
    <EditorContent editor={editor} />
  </div>;
}
