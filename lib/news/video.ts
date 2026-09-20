// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {get, list} from "@vercel/blob";
import {addBundleToSandbox, createSandbox, renderMediaOnVercel} from "@remotion/vercel";
import {ProcessedNews} from "./types";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const TEMPLATE_DURATION = 6.0666666667;

const TEMPLATE = {
  imageLeft: 92,
  imageTop: 280,
  imageWidth: 896,
  imageHeight: 875,
};

async function download(url: string, target: string) {
  if (!url) throw new Error("Görsel URL'si boş.");
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Görsel indirilemedi: HTTP ${response.status} — ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error(`Görsel boş döndü: ${url}`);
  await fs.writeFile(target, buffer);
}

async function downloadPrivateTemplate(pathname: string, target: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob tokenı tanımlı değil.");

  const result = await get(pathname, {access: "private", token});
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Haber video şablonu Blob'dan indirilemedi: ${pathname}`);
  }

  const reader = result.stream.getReader();
  const chunks: Buffer[] = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("Haber video şablonu Blob'dan boş döndü.");
  await fs.writeFile(target, buffer);
}

async function downloadTemplate(target: string) {
  const templateUrl = process.env.NEWS_TEMPLATE_VIDEO_URL?.trim();
  if (templateUrl) {
    await download(templateUrl, target);
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob tokenı tanımlı değil.");

  const {blobs} = await list({prefix: "news/template", limit: 100, token});
  const template = blobs
    .filter((blob) => blob.pathname.startsWith("news/template-") || blob.pathname === "news/template.mp4")
    .sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

  if (!template?.pathname) {
    throw new Error("Haber video şablonu Blob içinde bulunamadı. Lütfen önce MP4 şablonunu yükleyin.");
  }

  await downloadPrivateTemplate(template.pathname, target);
}

export async function createNewsVideo(item: ProcessedNews) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aio-news-remotion-"));
  const templatePath = path.join(dir, "template.mp4");
  const imagePath = path.join(dir, "news-image.png");
  const outputPath = path.join(os.tmpdir(), `aio-news-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

  const sandbox = await createSandbox({
    resources: {vcpus: 4},
    timeoutInMilliseconds: 15 * 60 * 1000,
  });

  try {
    console.log("[video] remotion sandbox created", {sandboxId: sandbox.sandboxId});
    await downloadTemplate(templatePath);
    await download(item.imageUrl, path.join(dir, "source-image"));
    
    await sharp(path.join(dir, "source-image"))
      .resize(TEMPLATE.imageWidth, TEMPLATE.imageHeight, {fit: "cover", position: "centre"})
      .png()
      .toFile(imagePath);

    await addBundleToSandbox({sandbox, bundleDir: path.resolve(process.cwd(), "remotion-build")});

    // addBundleToSandbox places the compiled Remotion site in the sandbox bundle directory.
    // The composition reads these two dynamic assets with staticFile().
    await sandbox.writeFiles([
      {path: "/vercel/sandbox/remotion-bundle/template.mp4", content: await fs.readFile(templatePath)},
      {path: "/vercel/sandbox/remotion-bundle/news-image.png", content: await fs.readFile(imagePath)},
    ]);

    console.log("[video] rendering with Remotion");

    const render = await renderMediaOnVercel({
      sandbox,
      compositionId: "NewsVideo",
      inputProps: {
        title: item.socialTitle,
        body: item.socialText,
      },
      outputFile: outputPath,
      codec: "h264",
      crf: 18,
      pixelFormat: "yuv420p",
      concurrency: 2,
      timeoutInMilliseconds: 120000,
    });

    const rendered = await sandbox.readFileToBuffer({path: render.sandboxFilePath});
    if (!rendered?.length) throw new Error("Remotion çıktı videosu boş.");

    await fs.writeFile(outputPath, rendered);

    console.log("[video] remotion render complete", {bytes: rendered.length});

    return {
      mode: "remotion" as const,
      videoPath: outputPath,
      width: WIDTH,
      height: HEIGHT,
      duration: TEMPLATE_DURATION,
    };
  } finally {
    await sandbox.stop().catch(() => undefined);
    await fs.rm(dir, {recursive: true, force: true}).catch(() => undefined);
  }
}
