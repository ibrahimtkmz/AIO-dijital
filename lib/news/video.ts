import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { ProcessedNews } from "./types";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 12;

// This is the code-side version of the CapCut template.
// Once the user creates the visual template in CapCut, only these values
// need to be adjusted to match it.
const TEMPLATE = {
  imageTop: 300,
  imageHeight: 930,
  titleTop: 80,
  titleWidth: 920,
  titleFontSize: 66,
  titleColor: "#ffffff",
  panelTop: 1230,
  panelHeight: 520,
  panelColor: "#071020",
  bodyTop: 1285,
  bodyFontSize: 43,
  bodyColor: "#ffffff",
  sourceBottom: 70,
  sourceFontSize: 28,
  sourceColor: "#d8dee9",
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function textSvg(item: ProcessedNews) {
  const titleLines = wrapText(item.socialTitle.slice(0, 180), 25).slice(0, 4);
  const bodyLines = wrapText(item.socialText.slice(0, 520), 43).slice(0, 9);
  const title = titleLines
    .map((line, index) => `<tspan x="50%" dy="${index === 0 ? 0 : TEMPLATE.titleFontSize * 1.08}">${escapeXml(line)}</tspan>`)
    .join("");
  const body = bodyLines
    .map((line, index) => `<tspan x="50%" dy="${index === 0 ? 0 : TEMPLATE.bodyFontSize * 1.25}">${escapeXml(line)}</tspan>`)
    .join("");

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${TEMPLATE.panelTop}" width="${WIDTH}" height="${TEMPLATE.panelHeight}" rx="24" fill="${TEMPLATE.panelColor}" opacity="0.94"/>
  <text x="50%" y="${TEMPLATE.titleTop}" text-anchor="middle"
        font-family="Arial, DejaVu Sans, sans-serif" font-size="${TEMPLATE.titleFontSize}"
        font-weight="800" fill="${TEMPLATE.titleColor}" dominant-baseline="hanging">
    ${title}
  </text>
  <text x="50%" y="${TEMPLATE.bodyTop}" text-anchor="middle"
        font-family="Arial, DejaVu Sans, sans-serif" font-size="${TEMPLATE.bodyFontSize}"
        font-weight="500" fill="${TEMPLATE.bodyColor}" dominant-baseline="hanging">
    ${body}
  </text>
  <text x="50%" y="${HEIGHT - TEMPLATE.sourceBottom}" text-anchor="middle"
        font-family="Arial, DejaVu Sans, sans-serif" font-size="${TEMPLATE.sourceFontSize}"
        font-weight="500" fill="${TEMPLATE.sourceColor}">
    Kaynak: ${escapeXml(item.source)}
  </text>
</svg>`);
}

async function downloadImage(url: string, filePath: string) {
  if (!url) throw new Error("Haber görseli bulunamadı.");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Haber görseli indirilemedi: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

function runFfmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error("FFmpeg binary bulunamadı.");

  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg başarısız oldu: ${stderr}`));
    });
  });
}

export async function createNewsVideo(item: ProcessedNews) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aio-news-"));
  const sourcePath = path.join(dir, "source.jpg");
  const framePath = path.join(dir, "frame.png");
  const videoPath = path.join(dir, "news.mp4");

  try {
    await downloadImage(item.imageUrl, sourcePath);

    const image = await sharp(sourcePath)
      .resize(WIDTH, TEMPLATE.imageHeight, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    const background = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: { r: 7, g: 16, b: 32, alpha: 1 },
      },
    })
      .composite([
        {
          input: image,
          left: 0,
          top: TEMPLATE.imageTop,
        },
        {
          input: textSvg(item),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    await fs.writeFile(framePath, background);

    await runFfmpeg([
      "-y",
      "-loop", "1",
      "-i", framePath,
      "-t", String(DURATION),
      "-r", String(FPS),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      videoPath,
    ]);

    return {
      mode: "local" as const,
      videoPath,
      width: WIDTH,
      height: HEIGHT,
      duration: DURATION,
    };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}
