import { mindMapBounds, mindMapEdgeLabel, mindMapEdgeRoute, mindMapHierarchy, mindMapNodeAppearance } from "../mind-map";
import type { MindMap, MindMapNode } from "../mind-map";

const padding = 32;
const maximumSide = 6144;
const maximumPixels = 18_000_000;
const font = '600 14px "DM Sans Variable", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function wrapLabel(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines = [""];
  for (const { segment } of graphemes.segment(text)) {
    const index = lines.length - 1;
    const line = lines[index];
    if (segment !== "\n" && (!line || context.measureText(line + segment).width <= width)) {
      lines[index] += segment;
    } else if (lines.length < maxLines) {
      lines.push(segment === "\n" ? "" : segment.trimStart());
    } else {
      const last = Array.from(graphemes.segment(line), (part) => part.segment);
      while (last.length && context.measureText(last.join("") + "…").width > width) last.pop();
      lines[index] = last.join("").trimEnd() + "…";
      break;
    }
  }
  return lines;
}

function drawNode(context: CanvasRenderingContext2D, node: MindMapNode) {
  const { x, y } = node.position;
  const { width, height } = node.size;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const isEllipse = node.shape === "ellipse";
  const appearance = mindMapNodeAppearance(node);
  context.beginPath();
  if (isEllipse) context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
  else context.roundRect(x, y, width, height, 8);
  context.fillStyle = appearance.fill;
  context.fill();
  context.strokeStyle = appearance.border;
  context.lineWidth = 1;
  context.stroke();

  const maxWidth = isEllipse ? width * .7 : width - 24;
  const lineHeight = 19;
  const maxLines = Math.min(2, Math.max(1, Math.floor((height - 14) / lineHeight)));
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = appearance.ink;
  const lines = wrapLabel(context, node.text, maxWidth, maxLines);
  lines.forEach((line, index) => context.fillText(line, centerX, centerY + (index - (lines.length - 1) / 2) * lineHeight, maxWidth));
}

export async function renderMindMapPng(map: MindMap): Promise<Blob> {
  const bounds = mindMapBounds(map.nodes);
  if (!bounds) throw new Error("画布上没有导图节点。");
  const leftPadding = map.edges.some(({ label }) => label?.trim()) ? 84 : padding;
  const width = bounds.right - bounds.left + leftPadding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;
  const scale = Math.min(2, maximumSide / width, maximumSide / height, Math.sqrt(maximumPixels / (width * height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建导图图片。");
  await document.fonts.ready;
  context.fillStyle = "#f8f7f1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  context.translate(leftPadding - bounds.left, padding - bounds.top);

  const nodes = new Map(map.nodes.map((node) => [node.id, node]));
  const { depthById } = mindMapHierarchy(map);
  const labels: { text: string; x: number; y: number }[] = [];
  context.lineCap = "round";
  for (const edge of map.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    const { start, end, firstControl, lastControl, labelPoint, width, color } = mindMapEdgeRoute(from, to, depthById.get(from.id));
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.bezierCurveTo(firstControl.x, firstControl.y, lastControl.x, lastControl.y, end.x, end.y);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
    const text = mindMapEdgeLabel(edge);
    if (text) labels.push({ text, ...labelPoint });
  }
  context.font = font.replace("14px", "12px");
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#486857";
  context.strokeStyle = "#f8f7f1";
  context.lineWidth = 4;
  for (const { text, x, y } of labels) {
    context.strokeText(text, x, y, 240);
    context.fillText(text, x, y, 240);
  }
  for (const node of map.nodes) drawNode(context, node);

  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("无法生成 PNG 文件。");
  return png;
}
