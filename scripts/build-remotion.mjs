import {bundle} from "@remotion/bundler";
import path from "node:path";
import fs from "node:fs/promises";

const root = process.cwd();
const outDir = path.join(root, "remotion-build");

await fs.rm(outDir, {recursive:true, force:true});

await bundle({
  entryPoint: path.join(root, "remotion", "index.ts"),
  outDir,
  publicDir: null,
});

console.log("[remotion] bundle created", outDir);
