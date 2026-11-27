export interface Point {
  x: number;
  y: number;
}

export interface CanvasViewport {
  offset: Point;
  scale: number;
}

export function screenToCanvas(point: Point, viewport: CanvasViewport): Point {
  return {
    x: (point.x - viewport.offset.x) / viewport.scale,
    y: (point.y - viewport.offset.y) / viewport.scale,
  };
}

export function panViewport(viewport: CanvasViewport, delta: Point): CanvasViewport {
  return {
    ...viewport,
    offset: { x: viewport.offset.x + delta.x, y: viewport.offset.y + delta.y },
  };
}

export function zoomViewport(
  viewport: CanvasViewport,
  anchor: Point,
  scale: number,
): CanvasViewport {
  const nextScale = Math.min(4, Math.max(0.25, scale));
  const point = screenToCanvas(anchor, viewport);
  return {
    scale: nextScale,
    offset: { x: anchor.x - point.x * nextScale, y: anchor.y - point.y * nextScale },
  };
}
