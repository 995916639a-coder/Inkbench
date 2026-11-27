import type { MindMap } from "../mind-map";

export type TranslationDirection = "en-zh" | "zh-en";
export type TranslateText = (direction: TranslationDirection, segments: string[]) => Promise<string[]>;

export function isTranslationDirection(value: unknown): value is TranslationDirection {
  return value === "en-zh" || value === "zh-en";
}

export function suggestedDirection(text: string): TranslationDirection {
  const chinese = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const english = text.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  return chinese > english ? "zh-en" : "en-zh";
}

const protectedText = /(`[^`\n]+`|!?\[[^\]\n]*\]\((?:[^()\n]|\([^()\n]*\))*\)|\b(?:https?:\/\/|mailto:)[^\s<>]+)/giu;

function translationPlan(direction: TranslationDirection) {
  const segments: string[] = [];
  const indexes = new Map<string, number>();
  const sourceLetters = direction === "zh-en" ? /\p{Script=Han}/u : /[A-Za-z]{2}/;
  let translated: string[] = [];

  function prepare(text: string): () => string {
    const original = text.split(protectedText);
    const parts = original.map((part, index) => {
      const body = part.trim();
      if (index % 2 === 1 || !sourceLetters.test(body) || /^[A-Z\d_./-]+$/.test(body)) return () => part;
      let slot = indexes.get(body);
      if (slot === undefined) {
        slot = segments.length;
        indexes.set(body, slot);
        segments.push(body);
      }
      const start = part.length - part.trimStart().length;
      const end = part.trimEnd().length;
      return () => part.slice(0, start) + translated[slot].trim() + part.slice(end);
    });
    return () => {
      const rendered = parts.map((part) => part());
      if (direction !== "zh-en") return rendered.join("");
      return rendered.map((part, index) => {
        const previous = rendered[index - 1];
        if (index % 2 === 1 && previous !== original[index - 1] && /[A-Za-z0-9]$/.test(previous) && /^\S/.test(part)) return " " + part;
        if (index > 0 && index % 2 === 0 && part !== original[index] && /\S$/.test(previous) && /^[A-Za-z0-9]/.test(part)) return " " + part;
        return part;
      }).join("");
    };
  }

  return {
    prepare,
    async run(translate: TranslateText) {
      if (!segments.length) return false;
      translated = await translate(direction, segments);
      if (translated.length !== segments.length || translated.some((text) => !text.trim())) {
        throw new Error("Incomplete translation");
      }
      return true;
    },
  };
}

export async function translateMindMap(map: MindMap, direction: TranslationDirection, translate: TranslateText): Promise<MindMap | null> {
  const plan = translationPlan(direction);
  const nodes = map.nodes.map((node) => {
    const text = plan.prepare(node.text);
    return () => ({ ...node, text: text() });
  });
  const edges = map.edges.map((edge) => {
    const label = edge.label === undefined ? null : plan.prepare(edge.label);
    return () => label ? { ...edge, label: label() } : edge;
  });
  if (!await plan.run(translate)) return null;
  return { nodes: nodes.map((node) => node()), edges: edges.map((edge) => edge()) };
}
