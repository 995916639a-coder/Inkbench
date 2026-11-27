import type { Point } from "../viewport";

export type StrokePath = readonly [Point, ...Point[]];

export function finishStroke(points: readonly Point[]): StrokePath | null {
  const distinct = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || point.x !== previous.x || point.y !== previous.y;
  });
  const [first, ...remaining] = distinct;
  return first ? [first, ...remaining] : null;
}
