import { copyDocumentContent } from "../function/documents";
import type { Note } from "../function/documents";
import { createCanvas } from "./workspace";
import type { Workspace } from "./workspace";

export function createSampleWorkspace(): Workspace {
  const apiNote: Note = {
    id: "sample-api-note",
    title: "API 联调笔记",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "设备状态接口" }] },
        { type: "paragraph", content: [{ type: "text", text: "确认设备在线状态与最后上报时间。" }] },
        {
          type: "paragraph",
          content: [{ type: "text", marks: [{ type: "code" }], text: "GET /api/v1/devices/{id}" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "json" },
          content: [{
            type: "text",
            text: '{\n  "id": "dev_1024",\n  "status": "online",\n  "lastSeen": "14:32:08"\n}',
          }],
        },
        { type: "paragraph", content: [{ type: "text", text: "返回 200 后对照日志验证状态字段。" }] },
      ],
    },
  };

  const releaseNote: Note = {
    id: "sample-release-note",
    title: "发布自查清单",
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "合并前完成这些检查。" }] },
        {
          type: "bulletList",
          content: ["确认工作区干净", "跑一遍类型检查和构建", "记录需要回归的功能"].map((text) => ({
            type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          })),
        },
        {
          type: "codeBlock",
          attrs: { language: "bash" },
          content: [{ type: "text", text: "git status --short\nnpm run typecheck\nnpm run build" }],
        },
      ],
    },
  };

  const canvas = createCanvas("sample-api-canvas", "API 联调画布");
  return {
    version: 1,
    notes: [apiNote, releaseNote],
    activeEntry: { kind: "canvas", id: canvas.id },
    canvases: [{
      ...canvas,
      items: [
        {
          id: "sample-api-card", kind: "note-card", position: { x: -345, y: -239 },
          title: apiNote.title, content: copyDocumentContent(apiNote.content),
        },
        {
          id: "sample-checks", kind: "text-box", position: { x: 112, y: -190 },
          text: "待确认\n错误响应是否返回 traceId\n超时重试的间隔和次数",
        },
        {
          id: "sample-environment", kind: "text-box", position: { x: 112, y: -22 },
          text: "本地环境\nGateway   :8080\nMock API   :3001",
        },
        {
          id: "sample-arrow", kind: "stroke",
          points: [
            { x: 49, y: -134 }, { x: 62, y: -136 }, { x: 76, y: -142 }, { x: 89, y: -151 },
            { x: 99, y: -160 }, { x: 89, y: -159 }, { x: 99, y: -160 }, { x: 97, y: -149 },
          ],
        },
      ],
    }],
  };
}
