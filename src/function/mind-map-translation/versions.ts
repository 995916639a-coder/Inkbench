import type { MindMap } from "../mind-map";
import type { TranslationDirection } from "./translation";

export type ContentLanguage = "zh-CN" | "en";

export interface LanguageVersions<T> {
  language: ContentLanguage;
  alternate: T;
}

export interface MindMapLabels {
  nodes: readonly { id: string; text: string }[];
  edges: readonly { id: string; label?: string }[];
}

export function translatedVersion<T>(direction: TranslationDirection, alternate: T): LanguageVersions<T> {
  return { language: direction === "zh-en" ? "en" : "zh-CN", alternate };
}

function otherLanguage(language: ContentLanguage): ContentLanguage {
  return language === "zh-CN" ? "en" : "zh-CN";
}

export function captureMindMapLabels(map: MindMap): MindMapLabels {
  return {
    nodes: map.nodes.map(({ id, text }) => ({ id, text })),
    edges: map.edges.map(({ id, label }) => label === undefined ? { id } : { id, label }),
  };
}

export function switchMindMapTranslation(map: MindMap, translation: LanguageVersions<MindMapLabels>) {
  const nodes = new Map(translation.alternate.nodes.map(({ id, text }) => [id, text]));
  const edges = new Map(translation.alternate.edges.map(({ id, label }) => [id, label]));
  const mindMap: MindMap = {
    nodes: map.nodes.map((node) => nodes.has(node.id) ? { ...node, text: nodes.get(node.id)! } : node),
    edges: map.edges.map((edge) => {
      const label = edges.get(edge.id);
      return edges.has(edge.id) && label !== edge.label ? { ...edge, label } : edge;
    }),
  };
  return {
    mindMap,
    mapTranslation: { language: otherLanguage(translation.language), alternate: captureMindMapLabels(map) },
  };
}
