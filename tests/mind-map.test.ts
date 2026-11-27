import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createWorkspaceStore } from "../desktop/workspaceStore";
import { importMarkdownFile } from "../src/function/markdown-import";
import {
  addMindMapChild, connectMindMapNodes, createMarkdownMindMap, createMindMapNode,
  organizeMindMap, removeMindMapElement, updateMindMapEdgeLabel,
} from "../src/function/mind-map";
import type { MindMap } from "../src/function/mind-map";
import { createCanvas } from "../src/workspace/workspace";
import type { Workspace } from "../src/workspace/workspace";

test("Markdown headings and nested lists form editable branches", async () => {
  const note = await importMarkdownFile(new File([
    "# 开发\n\n- 接口\n  - 联调\n\n## 检查\n\n# 发布\n",
  ], "计划.md"));
  let next = 0;
  const map = createMarkdownMindMap(note, { x: 20, y: 40 }, () => String(++next));
  const text = new Map(map.nodes.map((node) => [node.id, node.text]));
  assert.deepEqual(map.edges.map(({ from, to }) => `${text.get(from)} → ${text.get(to)}`).sort(), [
    "开发 → 接口", "开发 → 检查", "接口 → 联调", "计划 → 发布", "计划 → 开发",
  ].sort());
  assert.equal(map.nodes.find((node) => node.text === "计划")?.shape, "ellipse");
});

test("connections reject invalid endpoints and disappear when a node is deleted", () => {
  const parent = createMindMapNode("parent", "ellipse", { x: 0, y: 0 });
  const initial = { nodes: [parent], edges: [] };
  const map = addMindMapChild(initial, parent, "child", "line");
  assert.equal(map.edges[0].from, parent.id);
  assert.equal(map.edges[0].to, "child");
  assert.equal(connectMindMapNodes(map, { id: "missing", from: "parent", to: "absent" }), map);
  assert.equal(connectMindMapNodes(map, { id: "reverse", from: "child", to: "parent" }), map);
  assert.deepEqual(removeMindMapElement(map, "parent").edges, []);
  assert.deepEqual(initial.nodes, [parent]);
});

test("layout keeps cycles and leaves room for different node sizes", () => {
  const map: MindMap = {
    nodes: ["a", "b", "c", "d"].map((id) => createMindMapNode(id, "rectangle", { x: 0, y: 0 })),
    edges: [
      { id: "ac", from: "a", to: "c" }, { id: "cb", from: "c", to: "b" },
      { id: "ba", from: "b", to: "a" },
    ],
  };
  map.nodes[0].size = { width: 350, height: 120 };
  const arranged = organizeMindMap(map);
  assert.deepEqual(arranged.edges, map.edges);
  assert.deepEqual(arranged.nodes.map((node) => node.id), ["a", "b", "c", "d"]);
  for (const [index, left] of arranged.nodes.entries()) {
    for (const right of arranged.nodes.slice(index + 1)) {
      const overlaps = left.position.x < right.position.x + right.size.width && right.position.x < left.position.x + left.size.width
        && left.position.y < right.position.y + right.size.height && right.position.y < left.position.y + left.size.height;
      assert.equal(overlaps, false, `Nodes ${left.id} and ${right.id} overlap`);
    }
  }
  assert(map.nodes.every(({ position }) => position.x === 0 && position.y === 0));
});

test("desktop storage loads older canvases and persists styled, labelled maps", async () => {
  const folder = await mkdtemp(join(tmpdir(), "inkbench-workspace-test-"));
  try {
    const target = join(folder, "workspace.json");
    const canvas = createCanvas("legacy");
    const legacy: Workspace = { version: 1, notes: [], canvases: [canvas], activeEntry: { id: canvas.id, kind: "canvas" } };
    await writeFile(target, JSON.stringify(legacy));
    const store = createWorkspaceStore(target);
    assert.deepEqual(await store.loadWorkspace(), legacy);

    const parent = { ...createMindMapNode("parent", "ellipse", { x: 0, y: 0 }), tone: "blue" as const };
    const map = addMindMapChild({ nodes: [parent], edges: [] }, parent, "child", "link");
    const saved = { ...legacy, canvases: [{ ...canvas, mindMap: updateMindMapEdgeLabel(map, "link", "依赖") }] };
    await store.saveWorkspace(saved);
    await store.flush();
    assert.deepEqual(await createWorkspaceStore(target).loadWorkspace(), saved);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
