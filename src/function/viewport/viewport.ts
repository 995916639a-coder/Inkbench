export interface Point {
  x: number;
  y: number;
}

export interface CanvasViewport {
  offset: Point;
  scale: number;
}

export declare function screenToCanvas(point: Point, viewport: CanvasViewport): Point;

export declare function panViewport(viewport: CanvasViewport, delta: Point): CanvasViewport;

export declare function zoomViewport(
  viewport: CanvasViewport,
  anchor: Point,
  scale: number,
): CanvasViewport;
