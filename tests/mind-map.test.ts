import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createWorkspaceStore } from "../desktop/workspaceStore";
import { addStroke, undoLastStroke } from "../src/function/canvas-items";
import { annotationArrowPath } from "../src/function/drawing";
import { importMarkdownFile } from "../src/function/markdown-import";
import {
  addMindMapChild, connectMindMapNodes, createMarkdownMindMap, createMindMapNode,
  mindMapBounds, mindMapEdgeRoute, mindMapHierarchy, organizeMindMap, removeMindMapElement, updateMindMapEdgeLabel,
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

test("Markdown with a long list uses both sides and retains the title above the heading", async () => {
  const items = Array.from({ length: 60 }, (_, index) => `- 条目 ${index + 1}`).join("\n");
  const note = await importMarkdownFile(new File([`# 主要内容\n\n${items}`], "说明.md"));
  let next = 0;
  const map = createMarkdownMindMap(note, { x: 10, y: 20 }, () => String(++next));
  const [root, heading, ...leaves] = map.nodes;
  const bounds = mindMapBounds(map.nodes)!;
  assert.equal(bounds.left, 10);
  assert.equal(bounds.top, 20);
  assert.equal(map.edges.length, 61);
  assert.equal(root.position.x, heading.position.x);
  assert(root.position.y < heading.position.y);
  assert.equal(leaves.filter((node) => node.position.x < heading.position.x).length, 30);
  assert.equal(leaves.filter((node) => node.position.x > heading.position.x).length, 30);
  assert(bounds.bottom - bounds.top < 4000);
  assert.deepEqual(organizeMindMap(map), map);
});

test("connections meet node sides with smooth tangents and taper by hierarchy", () => {
  const from = createMindMapNode("root", "ellipse", { x: 100, y: 0 });
  const to = createMindMapNode("child", "rectangle", { x: 400, y: 280 });
  const leaf = createMindMapNode("leaf", "rectangle", { x: 680, y: 330 });
  const map: MindMap = { nodes: [leaf, to, from], edges: [
    { id: "first", from: from.id, to: to.id }, { id: "second", from: to.id, to: leaf.id },
  ] };
  const { depthById } = mindMapHierarchy(map);
  const main = mindMapEdgeRoute(from, to, depthById.get(from.id));
  const branch = mindMapEdgeRoute(to, leaf, depthById.get(to.id));
  assert.equal(main.start.x, from.position.x + from.size.width);
  assert.equal(main.end.x, to.position.x);
  assert.equal(main.firstControl.y, main.start.y);
  assert.equal(main.lastControl.y, main.end.y);
  assert(main.width > branch.width);
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

test("arrow bends mirror each other while keeping the same endpoints", () => {
  const points = [{ x: 0, y: 0 }, { x: 150, y: 0 }] as const;
  const left = annotationArrowPath(...points, "left");
  const right = annotationArrowPath(...points, "right");
  assert.equal(annotationArrowPath(...points), right);

  const coordinates = (path: string) => path.split(" ").filter((value) => !/^[MCL]$/.test(value)).map(Number);
  const leftCoordinates = coordinates(left);
  const rightCoordinates = coordinates(right);
  assert.equal(leftCoordinates.length, 14);
  assert(leftCoordinates[3] < 0 && rightCoordinates[3] > 0);
  // The two wings swap when reflected, so compare the shaft separately.
  for (let index = 0; index < 8; index += 2) {
    assert(Math.abs(leftCoordinates[index] - rightCoordinates[index]) < 0.0001);
    assert(Math.abs(leftCoordinates[index + 1] + rightCoordinates[index + 1]) < 0.0001);
  }
  assert.match(left, /M .* L 150 0 L /);
  assert.match(right, /M .* L 150 0 L /);
});

test("both arrow bends and older annotations save and undo as single strokes", async () => {
  const folder = await mkdtemp(join(tmpdir(), "inkbench-arrow-test-"));
  try {
    const points = [{ x: 0, y: 80 }, { x: 150, y: 10 }] as const;
    const legacy = addStroke([], "legacy-arrow", points, { style: "arrow" });
    const left = addStroke(legacy, "left-arrow", points, { style: "arrow", bend: "left" });
    const items = addStroke(left, "right-arrow", points, { style: "arrow", bend: "right" });
    const canvas = { ...createCanvas("arrows"), items };
    const saved: Workspace = { version: 1, notes: [], canvases: [canvas], activeEntry: null };
    const store = createWorkspaceStore(join(folder, "workspace.json"));
    await store.saveWorkspace(saved);
    assert.deepEqual(await store.loadWorkspace(), saved);
    assert.deepEqual(undoLastStroke(items), left);
    assert.deepEqual(undoLastStroke(left), legacy);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
