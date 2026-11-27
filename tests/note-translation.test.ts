import assert from "node:assert/strict";
import { test } from "node:test";
import { translateMindMap, translateNote } from "../src/function/note-translation";
import type { DocumentContent } from "../src/function/documents";
import { createMindMapNode } from "../src/function/mind-map";
import type { MindMap } from "../src/function/mind-map";

test("translates note text once while preserving formatting, links, code and the source", async () => {
  const content: DocumentContent = {
    type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Setup guide", marks: [{ type: "bold" }] }] },
      { type: "paragraph", content: [
        { type: "text", text: " See the " },
        { type: "text", text: "manual", marks: [{ type: "link", attrs: { href: "https://example.org/test" } }] },
        { type: "text", text: " npm install", marks: [{ type: "code" }] },
      ] },
      { type: "codeBlock", attrs: { language: "js" }, content: [{ type: "text", text: "console.log('Original text')" }] },
    ],
  };
  const note = { title: "Setup guide", content };
  const original = structuredClone(note);
  const result = await translateNote(note, "en-zh", async (direction, segments) => {
    assert.equal(direction, "en-zh");
    assert.deepEqual(segments, ["Setup guide", "See the", "manual"]);
    return ["安装指南", "请参阅", "手册"];
  });
  assert.ok(result);
  assert.equal(result.title, "安装指南");
  assert.deepEqual(result.content.content?.[0], {
    type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "安装指南", marks: [{ type: "bold" }] }],
  });
  const paragraph = result.content.content?.[1].content;
  assert.equal(paragraph?.[0].text, " 请参阅 ");
  assert.deepEqual(paragraph?.[1], { type: "text", text: "手册", marks: [{ type: "link", attrs: { href: "https://example.org/test" } }] });
  assert.deepEqual(paragraph?.[2], content.content?.[1].content?.[2]);
  assert.deepEqual(result.content.content?.[2], content.content?.[2]);
  assert.deepEqual(note, original);
});

test("translates mind-map labels while retaining identifiers, positions, colors and edges", async () => {
  const map: MindMap = {
    nodes: [
      { ...createMindMapNode("root", "ellipse", { x: 3, y: 6 }, "设备状态"), tone: "sage" },
      createMindMapNode("child", "rectangle", { x: 200, y: 50 }, "`status`"),
    ],
    edges: [{ id: "edge", from: "root", to: "child", label: "读取" }],
  };
  const result = await translateMindMap(map, "zh-en", async (direction, segments) => {
    assert.equal(direction, "zh-en");
    assert.deepEqual(segments, ["设备状态", "读取"]);
    return ["Device status", "Read"];
  });
  assert.deepEqual(result, {
    nodes: [{ ...map.nodes[0], text: "Device status" }, map.nodes[1]],
    edges: [{ ...map.edges[0], label: "Read" }],
  });
  assert.equal(map.nodes[0].text, "设备状态");
});

test("skips empty input and fails safely on a partial translation", async () => {
  const content: DocumentContent = { type: "doc", content: [{ type: "paragraph" }] };
  assert.equal(await translateNote({ title: "API", content }, "en-zh", async () => assert.fail()), null);
  await assert.rejects(translateNote({ title: "API reference", content }, "en-zh", async () => []), /Incomplete/);
});

test("preserves literal Markdown links and separates translated words around inline code", async () => {
  const note = { title: "API", content: {
    type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "执行" },
      { type: "text", text: "npm", marks: [{ type: "code" }] },
      { type: "text", text: "查看[说明](docs/setup.md)" },
    ] }],
  } satisfies DocumentContent };
  const result = await translateNote(note, "zh-en", async (_direction, segments) => {
    assert.deepEqual(segments, ["执行", "查看"]);
    return ["Run", "See"];
  });
  const parts = result?.content.content?.[0].content;
  assert.equal(parts?.map(({ text }) => text).join(""), "Run npm See [说明](docs/setup.md)");
  assert.deepEqual(parts?.[2], { type: "text", text: "npm", marks: [{ type: "code" }] });
});
