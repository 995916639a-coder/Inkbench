import type { Point } from "../viewport";

export type StrokePath = readonly [Point, ...Point[]];

export declare function finishStroke(points: readonly Point[]): StrokePath | null;
