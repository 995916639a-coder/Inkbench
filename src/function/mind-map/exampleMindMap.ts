import type { DocumentNode, Note } from "../documents";

const branches = [
  { heading: "界面", items: ["笔记", "画布"] },
  { heading: "业务能力", items: ["Markdown 导入", "导图编辑"] },
  { heading: "本地数据", items: ["自动保存", "启动时恢复"] },
];

export function createMindMapExample(): Pick<Note, "title" | "content"> {
  const blocks: DocumentNode[] = branches.flatMap(({ heading, items }) => [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: heading }] },
    {
      type: "bulletList",
      content: items.map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ]);
  return { title: "墨栈项目结构", content: { type: "doc", content: blocks } };
}
