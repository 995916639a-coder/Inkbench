import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { resizeMindMapNode } from "../../function/mind-map";
import type { MindMapSize } from "../../function/mind-map";
import { panViewport, screenToCanvas } from "../../function/viewport";
import type { CanvasViewport, Point } from "../../function/viewport";

type GestureTarget =
  | { kind: "pan" }
  | { kind: "draw" }
  | { kind: "move"; id: string; target: "object" | "node"; position: Point }
  | { kind: "resize"; id: string; size: MindMapSize };

type GestureChange =
  | { kind: "pan"; viewport: CanvasViewport }
  | { kind: "draw"; points: readonly Point[] }
  | { kind: "move"; id: string; target: "object" | "node"; position: Point }
  | { kind: "resize"; id: string; size: MindMapSize };

interface ActiveGesture {
  target: GestureTarget;
  surface: HTMLDivElement;
  pointerId: number;
  start: Point;
  viewport: CanvasViewport;
  points: Point[];
}

export function pointerPosition(stage: HTMLElement, clientX: number, clientY: number): Point {
  const rect = stage.getBoundingClientRect();
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
}

function eventPoint(event: PointerEvent<HTMLDivElement>): Point {
  return pointerPosition(event.currentTarget, event.clientX, event.clientY);
}

function changeAt(gesture: ActiveGesture, point: Point): GestureChange {
  const { start, target, viewport } = gesture;
  const delta = { x: point.x - start.x, y: point.y - start.y };
  if (target.kind === "pan") return { kind: "pan", viewport: panViewport(viewport, delta) };
  if (target.kind === "draw") return { kind: "draw", points: [...gesture.points, screenToCanvas(point, viewport)] };
  const distance = { x: delta.x / viewport.scale, y: delta.y / viewport.scale };
  if (target.kind === "resize") return { ...target, size: resizeMindMapNode(target.size, distance) };
  return {
    ...target, position: { x: target.position.x + distance.x, y: target.position.y + distance.y },
  };
}

function isNodeMove(target: GestureTarget) {
  return target.kind === "move" && target.target === "node";
}

export function useCanvasGestures(viewport: CanvasViewport, onCommit: (change: GestureChange) => void) {
  const active = useRef<ActiveGesture | null>(null);
  const [draft, setDraft] = useState<GestureChange | null>(null);

  function begin(event: PointerEvent<HTMLDivElement>, target: GestureTarget) {
    const start = eventPoint(event);
    const surface = event.currentTarget;
    const points = target.kind === "draw" ? [screenToCanvas(start, viewport)] : [];
    active.current = { target, surface, pointerId: event.pointerId, start, viewport, points };

    // A click or double-click on a node must reach the node itself. Capture begins on movement.
    if (!isNodeMove(target)) {
      event.preventDefault();
      surface.focus({ preventScroll: true });
      surface.setPointerCapture(event.pointerId);
    }
    if (target.kind === "draw") setDraft({ kind: "draw", points: [...points] });
    else if (target.kind === "pan") setDraft({ kind: "pan", viewport });
  }

  function cancel(pointerId?: number): boolean {
    const gesture = active.current;
    if (!gesture || pointerId !== undefined && pointerId !== gesture.pointerId) return false;
    active.current = null;
    setDraft(null);
    if (gesture.surface.hasPointerCapture(gesture.pointerId)) gesture.surface.releasePointerCapture(gesture.pointerId);
    return true;
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = active.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const point = eventPoint(event);
    if (isNodeMove(gesture.target) && !gesture.surface.hasPointerCapture(event.pointerId)) {
      if (Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) < 3) return;
      gesture.surface.setPointerCapture(event.pointerId);
    }
    if (gesture.target.kind === "draw") {
      setDraft(changeAt(gesture, point));
      gesture.points.push(screenToCanvas(point, gesture.viewport));
    } else {
      setDraft(changeAt(gesture, point));
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const gesture = active.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const point = eventPoint(event);
    cancel(event.pointerId);
    const distance = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y);
    if (gesture.target.kind === "draw" || distance > 0 && (!isNodeMove(gesture.target) || distance >= 3)) {
      onCommit(changeAt(gesture, point));
    }
  }

  return { active, draft, begin, cancel, move, finish };
}
