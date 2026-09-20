import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { ProcessedNews } from "./types";
import { list } from "@vercel/blob";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const TEMPLATE_DURATION = 6.07;

const TEMPLATE = {
  imageLeft: 92,
  imageTop: 280,
  imageWidth: 896,
  imageHeight: 875,
  titleTop: 55,
  titleWidth: 900,
  titleFontSize: 60,
  titleLineHeight: 1.15,
  titleColor: "#ffffff",
  titleBg: "#ff2020",
  bodyLeft: 88,
  bodyTop: 1160,
  bodyWidth: 904,
  bodyHeight: 515,
  bodyFontSize: 42,
  bodyLineHeight: 1.24,
  bodyColor: "#111111",
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

function overlaySvg(item: ProcessedNews) {
  const titleLines = wrapText(item.socialTitle.slice(0, 120), 27).slice(0, 4);
  const bodyLines = wrapText(item.socialText.slice(0, 620), 44).slice(0, 10);

  const titleHeight = Math.max(92, titleLines.length * TEMPLATE.titleFontSize * TEMPLATE.titleLineHeight + 46);
  const titleX = (WIDTH - TEMPLATE.titleWidth) / 2;

  const title = titleLines.map((line, i) =>
    `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : TEMPLATE.titleFontSize * TEMPLATE.titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join("");

  const body = bodyLines.map((line, i) =>
    `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : TEMPLATE.bodyFontSize * TEMPLATE.bodyLineHeight}">${escapeXml(line)}</tspan>`
  ).join("");

  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${titleX}" y="${TEMPLATE.titleTop}" width="${TEMPLATE.titleWidth}" height="${titleHeight}" rx="38" fill="${TEMPLATE.titleBg}"/>
    <text x="${WIDTH / 2}" y="${TEMPLATE.titleTop + 34}" text-anchor="middle" dominant-baseline="hanging"
      font-family="Arial, DejaVu Sans, sans-serif" font-size="${TEMPLATE.titleFontSize}" font-weight="500" fill="${TEMPLATE.titleColor}">${title}</text>

    <rect x="${TEMPLATE.bodyLeft}" y="${TEMPLATE.bodyTop}" width="${TEMPLATE.bodyWidth}" height="${TEMPLATE.bodyHeight}" rx="22" fill="#ffffff"/>
    <text x="${WIDTH / 2}" y="${TEMPLATE.bodyTop + 42}" text-anchor="middle" dominant-baseline="hanging"
      font-family="Arial, DejaVu Sans, sans-serif" font-size="${TEMPLATE.bodyFontSize}" font-weight="400" fill="${TEMPLATE.bodyColor}">${body}</text>
  </svg>`);
}

async function download(url: string, target: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Şablon/görsel indirilemedi: HTTP ${response.status}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function downloadTemplate(target: string) {
  const templateUrl = process.env.NEWS_TEMPLATE_VIDEO_URL?.trim();
  if (templateUrl) {
    await download(templateUrl, target);
    return;
  }

  const { blobs } = await list({ prefix: "news/template.mp4", limit: 1 });
  const template = blobs[0];
  if (!template?.url) throw new Error("Haber video şablonu yüklenmemiş.");
  await download(template.url, target);
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
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg başarısız: ${stderr}`)));
  });
}

export async function createNewsVideo(item: ProcessedNews) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aio-news-"));
  const templatePath = path.join(dir, "template.mp4");
  const sourcePath = path.join(dir, "source.jpg");
  const imagePath = path.join(dir, "news-image.png");
  const overlayPath = path.join(dir, "overlay.png");
  const videoPath = path.join(dir, "news.mp4");

  try {
    await Promise.all([downloadTemplate(templatePath), download(item.imageUrl, sourcePath)]);

    await sharp(sourcePath)
      .resize(TEMPLATE.imageWidth, TEMPLATE.imageHeight, { fit: "cover", position: "centre" })
      .png()
      .toFile(imagePath);

    const overlay = await sharp(overlaySvg(item)).png().toBuffer();
    await fs.writeFile(overlayPath, overlay);

    await runFfmpeg([
      "-y",
      "-stream_loop", "-1",
      "-i", templatePath,
      "-i", imagePath,
      "-i", overlayPath,
      "-filter_complex",
      `[0:v]trim=duration=${TEMPLATE_DURATION},setpts=PTS-STARTPTS[bg];[1:v]format=rgba[news];[2:v]format=rgba[ov];[bg][news]overlay=${TEMPLATE.imageLeft}:${TEMPLATE.imageTop}:shortest=1[a];[a][ov]overlay=0:0:shortest=1[v]`,
      "-map", "[v]",
      "-t", String(TEMPLATE_DURATION),
      "-r", String(FPS),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      videoPath,
    ]);

    return { mode: "ffmpeg" as const, videoPath, width: WIDTH, height: HEIGHT, duration: TEMPLATE_DURATION };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}
