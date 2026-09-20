import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "MP4 dosyası gönderilmedi." }, { status: 400 });
    }

    if (file.type !== "video/mp4") {
      return NextResponse.json({ error: "Yalnızca MP4 şablon kabul edilir." }, { status: 400 });
    }

    const blob = await put("news/template.mp4", file, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Şablon yüklenemedi." },
      { status: 500 },
    );
  }
}
