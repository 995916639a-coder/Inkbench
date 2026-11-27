import type { Point } from "../viewport";

interface Curve {
  start: Point;
  firstControl: Point;
  lastControl: Point;
  end: Point;
}

export function curvePath({ start, firstControl, lastControl, end }: Curve): string {
  return `M ${start.x} ${start.y} C ${firstControl.x} ${firstControl.y} ${lastControl.x} ${lastControl.y} ${end.x} ${end.y}`;
}

export function annotationArrowPath(start: Point, end: Point): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return "";

  const bow = Math.min(44, .21 * distance);
  const normal = { x: -dy / distance * bow, y: dx / distance * bow };
  const firstControl = { x: start.x + dx * .34 + normal.x * .8, y: start.y + dy * .34 + normal.y * .8 };
  const lastControl = { x: start.x + dx * .72 + normal.x, y: start.y + dy * .72 + normal.y };
  const angle = Math.atan2(end.y - lastControl.y, end.x - lastControl.x);
  const length = Math.min(15, distance * .32);
  const wing = (offset: number) => ({
    x: end.x - length * Math.cos(angle + offset),
    y: end.y - length * Math.sin(angle + offset),
  });
  const left = wing(-.49);
  const right = wing(.49);
  return `${curvePath({ start, end, firstControl, lastControl })} M ${left.x} ${left.y} L ${end.x} ${end.y} L ${right.x} ${right.y}`;
}
