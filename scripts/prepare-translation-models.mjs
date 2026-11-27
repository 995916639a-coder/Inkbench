import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const models = {
  "en-zh": {
    revision: "046f55aec303cdee3e0318604406d4df20f1e8ea",
    files: {
      "config.json": "4727d1229a04f95bf6f39abf949d8080615433d99d6ebd85f81c09edd247d5fa",
      "generation_config.json": "b743baabb7da4c1a2f19fe558bd6b4c0c7c3b0762fcb5ca7a48fe5a2c2219803",
      "tokenizer.json": "d0c7da27056e8f42adce9e76d8e792e5daa64e15f5acd2e7aabf0121877dd4c1",
      "tokenizer_config.json": "a914596e6bff113a8428d4793b586da87cd0b95697a0e72aba90cc1d95858481",
      "onnx/encoder_model_quantized.onnx": "d3b7912bf6a9bd27e4c074c2df91d4ff3d5b4bc5f7f6c8d7cc9c805c98fbafee",
      "onnx/decoder_model_merged_quantized.onnx": "023be4f841f4c47cd65fffcbaa81c0d99d7f7e0138f7ba0e03fa220a4e688aff",
    },
  },
  "zh-en": {
    revision: "39d480d52a9ea3065a1f117adfe4dbc55de10e6f",
    files: {
      "config.json": "293d318fce41dbf04114eac45037bb88a32d7c4ee21011a75e24a8b98ca45ad1",
      "generation_config.json": "8dc29fef0fe82109f94ef3c2e6ea6bded3215d357b226c34cf7b4630726766c9",
      "tokenizer.json": "b306d0301cf280bfd647d7067b5ade2a97b987e6d678df110703c002433643ff",
      "tokenizer_config.json": "08849acc0a539c4749d8665e9d6217735503a97871ccebeea8a762d5fba1acf7",
      "onnx/encoder_model_quantized.onnx": "84d5e171b626bc8b6b220d022ac58696e9528c25deeacca62b5cbf4364547a99",
      "onnx/decoder_model_merged_quantized.onnx": "c6b7f04ff1ba0fbd1bf6852599b4c0cad6fe512d57cd887f44ef36cf705424cb",
    },
  },
};

const destination = "translation-models";
async function checksum(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function prepareFile(repo, revision, name, expected) {
  const path = join(destination, repo, name);
  const existingHash = await checksum(path).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (existingHash === expected) return;

  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    const response = await fetch(`https://huggingface.co/${repo}/resolve/${revision}/${name}?download=true`, {
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}: ${repo}/${name}`);
    await pipeline(response.body, createWriteStream(temporary));
    if (await checksum(temporary) !== expected) throw new Error(`Checksum mismatch: ${repo}/${name}`);
    await rename(temporary, path);
    console.log(`Prepared ${repo}/${name}`);
  } finally {
    await rm(temporary, { force: true });
  }
}

for (const [direction, { revision, files }] of Object.entries(models)) {
  const repo = `Xenova/opus-mt-${direction}`;
  await Promise.all(Object.entries(files).map(([name, hash]) => prepareFile(repo, revision, name, hash)));
}
await copyFile("docs/translation-model-notices.md", join(destination, "NOTICE.md"));
await copyFile("docs/translation-model-apache-2.0.txt", join(destination, "LICENSE-APACHE-2.0.txt"));
