import {bundle} from "@remotion/bundler";
import {getCompositions, renderMedia} from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";

const root = process.cwd();
const publicDir = path.join(root, "remotion", "public");
const outDir = path.join(root, ".remotion-smoke-bundle");
const output = path.join(root, "remotion-smoke.mp4");

await fs.mkdir(publicDir, {recursive: true});
await new Promise((resolve, reject) => {
  const p = spawn("ffmpeg", ["-y","-f","lavfi","-i","color=c=0x101010:s=1080x1920:r=30","-t","2","-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",path.join(publicDir,"template.mp4")], {stdio:"inherit"});
  p.on("exit",(code)=>code===0?resolve():reject(new Error("ffmpeg template failed")));
});
await fs.writeFile(path.join(publicDir,"news-image.png"), Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAlgAAAMgCAIAAAC7W7sPAAAACXBIWXMAAAsSAAALEgHS3X78AAABT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVtZ3NwYWNl".replace(/[^A-Za-z0-9+/=]/g,""), "base64"
));
await fs.rm(outDir,{recursive:true,force:true});
await bundle({entryPoint:path.join(root,"remotion","index.ts"),outDir,publicDir});
const compositions = await getCompositions(outDir);
const composition = compositions.find((c)=>c.id==="NewsVideo");
if (!composition) throw new Error("NewsVideo composition not found");
await renderMedia({composition,serveUrl:outDir,codec:"h264",outputLocation:output,inputProps:{title:"Remotion test başlığı",body:"Bu video Remotion render smoke testidir."},concurrency:2});
const stat = await fs.stat(output);
console.log("REMOTION_SMOKE_OK", stat.size);
