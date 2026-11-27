export interface Point {
  x: number;
  y: number;
}

export interface CanvasViewport {
  offset: Point;
  scale: number;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const minimumCanvasScale = .05;

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
  const nextScale = Math.min(4, Math.max(Math.min(minimumCanvasScale, viewport.scale), scale));
  const point = screenToCanvas(anchor, viewport);
  return {
    scale: nextScale,
    offset: { x: anchor.x - point.x * nextScale, y: anchor.y - point.y * nextScale },
  };
}

export function fitViewport(bounds: Bounds, available: { width: number; height: number }, maximumScale = 1): CanvasViewport {
  const { left, right, top, bottom } = bounds;
  const scale = Math.min(maximumScale, available.width / Math.max(1, right - left),
    available.height / Math.max(1, bottom - top));
  return { scale, offset: { x: -(left + right) / 2 * scale, y: -(top + bottom) / 2 * scale } };
}
