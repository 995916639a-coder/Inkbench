import { env, pipeline } from "@huggingface/transformers";
import type { TranslationPipeline } from "@huggingface/transformers";
import type { TranslationDirection } from "../src/function/mind-map-translation";

env.localModelPath = process.argv[2];
env.allowRemoteModels = false;
env.useFSCache = false;

let active: { direction: TranslationDirection; engine: TranslationPipeline } | undefined;
const segmenters = {
  "en-zh": new Intl.Segmenter("en", { granularity: "sentence" }),
  "zh-en": new Intl.Segmenter("zh-CN", { granularity: "sentence" }),
};

function splitText(text: string, direction: TranslationDirection): string[] {
  const parts: string[] = [];
  for (const { segment } of segmenters[direction].segment(text)) {
    const characters = Array.from(segment.trim());
    while (characters.length > 180) {
      const boundary = characters.slice(0, 180).lastIndexOf(" ");
      parts.push(characters.splice(0, boundary >= 90 ? boundary + 1 : 180).join("").trim());
    }
    if (characters.length) parts.push(characters.join("").trim());
  }
  return parts.filter(Boolean);
}

async function translate(direction: TranslationDirection, segments: string[]) {
  if (active?.direction !== direction) {
    await active?.engine.dispose();
    active = undefined;
    const engine = await pipeline("translation", `Xenova/opus-mt-${direction}`, {
      dtype: "q8", device: "cpu", local_files_only: true,
      session_options: { intraOpNumThreads: 4, interOpNumThreads: 1 },
    });
    active = { direction, engine };
  }
  const { engine } = active;
  const translated: string[] = [];
  for (const segment of segments) {
    const parts: string[] = [];
    for (const text of splitText(segment, direction)) {
      // Short labels translate more reliably with a boundary and without batch padding.
      const addColon = !/[.!?:;。！？：；…]$/u.test(text);
      const input = addColon ? text + (direction === "zh-en" ? "：" : ":") : text;
      const tokens = engine.tokenizer.encode(input).length;
      const [result] = await engine(input, {
        num_beams: 1,
        max_new_tokens: Math.min(480, Math.max(16, tokens * 3 + 12)),
        no_repeat_ngram_size: 3,
        repetition_penalty: 1.15,
      });
      let output = result.translation_text.trim();
      if (addColon) output = output.replace(/[\s:：.。]+$/u, "");
      if (direction === "en-zh") {
        output = output.replace(/(\p{Script=Han})\s+(?=\p{Script=Han})/gu, "$1").replace(/\s+([。！？；，、])/gu, "$1");
      }
      parts.push(output);
    }
    translated.push(parts.join(direction === "zh-en" ? " " : ""));
  }
  return translated;
}

process.parentPort.on("message", ({ data }: { data: { direction: TranslationDirection; segments: string[] } }) => {
  void translate(data.direction, data.segments).then(
    (texts) => process.parentPort.postMessage({ texts }),
    () => process.parentPort.postMessage({ error: true }),
  );
});
