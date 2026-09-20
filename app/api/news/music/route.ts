import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({error:"Vercel Blob tokenı tanımlı değil."},{status:500});

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({error:"MP3 dosyası gönderilmedi."},{status:400});
    }

    if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")) {
      return NextResponse.json({error:"Yalnızca MP3 kabul edilir."},{status:400});
    }

    const blob = await put("news/music/golden-brown.mp3", file, {
      access:"private",
      addRandomSuffix:false,
      token,
    });

    return NextResponse.json({ok:true, pathname:blob.pathname});
  } catch (error) {
    console.error("[music] upload failed", error);
    return NextResponse.json(
      {error:error instanceof Error ? error.message : "Müzik yüklenemedi."},
      {status:500},
    );
  }
}
