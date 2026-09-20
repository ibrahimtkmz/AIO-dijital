const fs = require("node:fs");
const path = require("node:path");
const ffmpeg = require("ffmpeg-static");

if (!ffmpeg) throw new Error("ffmpeg-static binary bulunamadı");

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(ffmpeg, path.join(publicDir, "ffmpeg"));
console.log("[build] ffmpeg copied to public/ffmpeg");
