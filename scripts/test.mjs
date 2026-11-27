import { spawnSync } from "node:child_process";
import { glob, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const temporary = await mkdtemp(join(tmpdir(), "inkbench-tests-"));
try {
  const entryPoints = await Array.fromAsync(glob("tests/*.test.ts"));
  await build({
    entryPoints, outdir: temporary, bundle: true, platform: "node", target: "node22",
    format: "esm", outExtension: { ".js": ".mjs" }, sourcemap: "inline",
  });
  const tests = (await readdir(temporary)).map((name) => join(temporary, name));
  const result = spawnSync(process.execPath, ["--enable-source-maps", "--test", ...tests], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
