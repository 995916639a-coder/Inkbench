import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWorkspaceStore } from "../desktop/workspaceStore";
import { duplicateCanvas } from "../src/function/canvas-duplicate";
import {
  captureMindMapLabels, switchMindMapTranslation, translatedVersion, translateMindMap,
} from "../src/function/mind-map-translation";
import { switchSavedNoteLanguage } from "../src/function/documents";
import type { DocumentContent, Note } from "../src/function/documents";
import { createMindMapNode } from "../src/function/mind-map";
import type { MindMap } from "../src/function/mind-map";
import { createCanvas } from "../src/workspace/workspace";

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

test("skips blank maps and rejects incomplete translations", async () => {
  assert.equal(await translateMindMap({ nodes: [], edges: [] }, "en-zh", async () => assert.fail()), null);
  const map = { nodes: [createMindMapNode("root", "ellipse", { x: 0, y: 0 }, "API reference")], edges: [] };
  await assert.rejects(translateMindMap(map, "en-zh", async () => []), /Incomplete/);
});

test("restores both stored languages from a 1.2.0 note after reopening the workspace", async () => {
  const directory = await mkdtemp(join(tmpdir(), "inkbench-translation-"));
  try {
    const store = createWorkspaceStore(join(directory, "workspace.json"));
    const original = { id: "note", title: "中文手稿", content: {
      type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "原文包含稳定的术语。" }] }],
    } satisfies DocumentContent };
    const result = { title: "Draft", content: {
      type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original terminology." }] }],
    } satisfies DocumentContent };
    const edited: Note = {
      id: original.id, title: "Edited draft", content: result.content,
      translation: { language: "en", alternate: { title: original.title, content: original.content } },
    };
    await store.saveWorkspace({ version: 1, notes: [edited], canvases: [], activeEntry: { kind: "note", id: original.id } });
    const loaded = (await store.loadWorkspace())?.notes[0];
    assert.ok(loaded);
    const restored = switchSavedNoteLanguage(loaded);
    assert.equal(restored.id, original.id);
    assert.equal(restored.title, original.title);
    assert.deepEqual(restored.content, original.content);
    assert.deepEqual(switchSavedNoteLanguage(restored), edited);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("switches map labels, retaining edited geometry and remapping both languages on canvas copies", () => {
  const map: MindMap = {
    nodes: [
      createMindMapNode("one", "ellipse", { x: 0, y: 0 }, "设备"),
      createMindMapNode("two", "rectangle", { x: 220, y: 0 }, "配置"),
    ],
    edges: [{ id: "edge", from: "one", to: "two", label: "读取" }],
  };
  const translated: MindMap = {
    nodes: [{ ...map.nodes[0], text: "Device", position: { x: 50, y: 60 } }, { ...map.nodes[1], text: "Settings" }],
    edges: [{ ...map.edges[0], label: "Read" }],
  };
  const mapTranslation = translatedVersion("zh-en", captureMindMapLabels(map));
  const restored = switchMindMapTranslation(translated, mapTranslation);
  assert.equal(restored.mapTranslation.language, "zh-CN");
  assert.equal(restored.mindMap.nodes[0].text, "设备");
  assert.deepEqual(restored.mindMap.nodes[0].position, { x: 50, y: 60 });
  assert.equal(restored.mindMap.edges[0].label, "读取");
  assert.deepEqual(switchMindMapTranslation(restored.mindMap, restored.mapTranslation), { mindMap: translated, mapTranslation });

  const canvas = { ...createCanvas("canvas"), mindMap: translated, mapTranslation };
  let id = 0;
  const copy = duplicateCanvas(canvas, [], () => `copy-${++id}`);
  assert.ok(copy.mindMap && copy.mapTranslation);
  const switchedCopy = switchMindMapTranslation(copy.mindMap, copy.mapTranslation);
  assert.equal(switchedCopy.mindMap.nodes[0].text, "设备");
  assert.equal(switchedCopy.mindMap.edges[0].label, "读取");
  assert.equal(switchedCopy.mindMap.edges[0].from, switchedCopy.mindMap.nodes[0].id);
  assert.notEqual(switchedCopy.mindMap.nodes[0].id, map.nodes[0].id);
});
