import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { ProcessedNews } from "./types";
import { get, list } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";

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
  if (!url) throw new Error("Görsel URL'si boş.");
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Şablon/görsel indirilemedi: HTTP ${response.status} — ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error(`Şablon/görsel boş döndü: ${url}`);
  await fs.writeFile(target, buffer);
  console.log("[video] downloaded", { url, bytes: buffer.length });
}

async function downloadPrivateTemplate(pathname: string, target: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob tokenı tanımlı değil.");

  const result = await get(pathname, {
    access: "private",
    token,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Haber video şablonu Blob'dan indirilemedi: ${pathname}`);
  }

  const reader = result.stream.getReader();
  const chunks: Buffer[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("Haber video şablonu Blob'dan boş döndü.");

  await fs.writeFile(target, buffer);
  console.log("[video] private template downloaded", {
    pathname,
    bytes: buffer.length,
  });
}

async function downloadTemplate(target: string) {
  const templateUrl = process.env.NEWS_TEMPLATE_VIDEO_URL?.trim();
  if (templateUrl) {
    await download(templateUrl, target);
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob tokenı tanımlı değil.");

  const { blobs } = await list({
    prefix: "news/template",
    limit: 100,
    token,
  });

  const template = blobs
    .filter((blob) => blob.pathname.startsWith("news/template-") || blob.pathname === "news/template.mp4")
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

  if (!template?.pathname) {
    console.error("[video] no template blob found", {
      count: blobs.length,
      pathnames: blobs.map((blob) => blob.pathname),
    });
    throw new Error("Haber video şablonu Blob içinde bulunamadı. Lütfen önce MP4 şablonunu yükleyin.");
  }

  await downloadPrivateTemplate(template.pathname, target);
}

async function runFfmpeg(args: string[], inputFiles: Array<{ path: string; content: Buffer }>, outputPath: string) {
  const sandbox = await Sandbox.create({
    runtime: "node24",
    persistent: false,
    timeout: 10 * 60 * 1000,
    resources: { vcpus: 2 },
  });

  try {
    await sandbox.writeFiles(
      inputFiles.map((file) => ({
        path: `/vercel/sandbox/${path.basename(file.path)}`,
        content: file.content,
      })),
    );

    const ffmpegBinaryPath = path.join(process.cwd(), "public", "ffmpeg");
    const ffmpegBytes = await fs.readFile(ffmpegBinaryPath);
    await sandbox.writeFiles([{ path: "/vercel/sandbox/ffmpeg", content: ffmpegBytes }]);
    await sandbox.runCommand({ cmd: "chmod", args: ["+x", "/vercel/sandbox/ffmpeg"] });

    const sandboxArgs = args.map((arg) =>
      inputFiles.concat([{ path: outputPath, content: Buffer.alloc(0) }]).reduce(
        (value, file) => value.split(file.path).join(`/vercel/sandbox/${path.basename(file.path)}`),
        arg,
      ),
    );

    const result = await sandbox.runCommand({
      cmd: "/vercel/sandbox/ffmpeg",
      args: sandboxArgs,
      cwd: "/vercel/sandbox",
    });

    if (result.exitCode !== 0) {
      throw new Error(`FFmpeg başarısız: ${(await result.stderr()).slice(-12000)}`);
    }

    const rendered = await sandbox.readFileToBuffer({
      path: `/vercel/sandbox/${path.basename(outputPath)}`,
    });

    if (!rendered?.length) {
      throw new Error("FFmpeg çıktı videosu boş.");
    }

    await fs.writeFile(outputPath, rendered);
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

export async function createNewsVideo(item: ProcessedNews) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aio-news-"));
  const templatePath = path.join(dir, "template.mp4");
  const sourcePath = path.join(dir, "source.jpg");
  const imagePath = path.join(dir, "news-image.png");
  const overlayPath = path.join(dir, "overlay.png");
  const videoPath = path.join(dir, "news.mp4");

  try {
    console.log("[video] preparing", { imageUrl: item.imageUrl });
    await downloadTemplate(templatePath);
    await download(item.imageUrl, sourcePath);
    console.log("[video] template and image ready");

    await sharp(sourcePath)
      .resize(TEMPLATE.imageWidth, TEMPLATE.imageHeight, { fit: "cover", position: "centre" })
      .png()
      .toFile(imagePath);

    const overlay = await sharp(overlaySvg(item)).png().toBuffer();
    await fs.writeFile(overlayPath, overlay);

    await runFfmpeg(
      [
        "-y",
        "-stream_loop", "-1",
        "-i", templatePath,
        "-loop", "1",
        "-i", imagePath,
        "-i", overlayPath,
        "-filter_complex",
        `[0:v]trim=duration=${TEMPLATE_DURATION},setpts=PTS-STARTPTS[bg];[1:v]format=rgba[news];[2:v]format=rgba[ov];[bg][news]overlay=${TEMPLATE.imageLeft}:${TEMPLATE.imageTop}:eof_action=repeat[a];[a][ov]overlay=0:0:eof_action=repeat[v]`,
        "-map", "[v]",
        "-t", String(TEMPLATE_DURATION),
        "-r", String(FPS),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        templatePath,
        imagePath,
        overlayPath,
        videoPath,
      ],
      [
        { path: templatePath, content: await fs.readFile(templatePath) },
        { path: imagePath, content: await fs.readFile(imagePath) },
        { path: overlayPath, content: overlay },
      ],
      videoPath,
    );

    return { mode: "ffmpeg" as const, videoPath, width: WIDTH, height: HEIGHT, duration: TEMPLATE_DURATION };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}
