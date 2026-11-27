import assert from "node:assert/strict";
import { test } from "node:test";
import { duplicateCanvas } from "../src/function/canvas-duplicate";
import { addMindMapChild, createMindMapNode } from "../src/function/mind-map";
import { createCanvas } from "../src/workspace/workspace";
import type { CanvasDocument } from "../src/workspace/workspace";

test("copies all canvas content with fresh identifiers and intact links", () => {
  const parent = createMindMapNode("root", "ellipse", { x: 10, y: 20 });
  const canvas: CanvasDocument = {
    ...createCanvas("original", "项目"),
    items: [{ id: "old-item", kind: "text-box", position: { x: 15, y: 25 }, text: "原笔记" }],
    mindMap: addMindMapChild({ nodes: [parent], edges: [] }, parent, "child", "old-link"),
  };
  let counter = 0;
  const clone = duplicateCanvas(canvas, ["项目 副本", "项目 副本 2"], () => `new-${++counter}`);
  assert.equal(clone.title, "项目 副本 3");
  assert.notEqual(clone.id, canvas.id);
  assert.notEqual(clone.items[0].id, canvas.items[0].id);
  assert(clone.mindMap && canvas.mindMap);
  const [first, second] = clone.mindMap.nodes;
  assert.deepEqual(clone.mindMap.edges[0], { id: "new-5", from: first.id, to: second.id });
  first.position.x = 120;
  assert.equal(canvas.mindMap.nodes[0].position.x, 10);
});
