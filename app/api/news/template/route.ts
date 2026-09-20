import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("[template] BLOB_READ_WRITE_TOKEN missing");
      return NextResponse.json({ error: "Vercel Blob tokenı tanımlı değil." }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "MP4 dosyası gönderilmedi." }, { status: 400 });
    }

    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ error: "Yalnızca MP4 şablon kabul edilir." }, { status: 400 });
    }

    const pathname = `news/template-${Date.now()}.mp4`;
    console.log("[template] uploading", {
      name: file.name,
      type: file.type,
      size: file.size,
      pathname,
    });

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      token,
    });

    console.log("[template] upload complete", {
      pathname: blob.pathname,
      url: blob.url,
    });

    return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error("[template] upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Şablon yüklenemedi." },
      { status: 500 },
    );
  }
}
