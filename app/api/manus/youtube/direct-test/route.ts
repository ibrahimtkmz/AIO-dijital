import { NextResponse } from "next/server";
import { uploadYoutubeVideo } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.DIRECT_UPLOAD_TEST_SECRET?.trim();
  if (!expected) throw new Error("DIRECT_UPLOAD_TEST_SECRET tanımlı değil.");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-direct-upload-secret")?.trim();
  return bearer === expected || header === expected;
}

export async function POST(request: Request) {
  try {
    if (!authorized(request)) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const body = await request.json() as {
      videoUrl?: string;
      title?: string;
      description?: string;
    };
    if (!body.videoUrl) return NextResponse.json({ error: "videoUrl gerekli." }, { status: 400 });
    if (!body.title) return NextResponse.json({ error: "title gerekli." }, { status: 400 });

    const result = await uploadYoutubeVideo({
      videoUrl: body.videoUrl,
      title: body.title,
      description: body.description || "",
      tags: ["shorts"],
      categoryId: "22",
      privacyStatus: "private",
    });

    return NextResponse.json({ ok: true, privacyStatus: "private", videoId: result.videoId, url: result.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
