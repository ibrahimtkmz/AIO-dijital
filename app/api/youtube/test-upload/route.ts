import {NextResponse} from "next/server";
import {getYoutubeChannel, uploadYoutubeVideo} from "@/lib/youtube";
import {readFile} from "node:fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({error: "Test endpoint preview ortamında kullanılabilir."}, {status: 404});
  }

  try {
    const channel = await getYoutubeChannel();
    const testPath = "/tmp/youtube-test.mp4";
    await readFile(testPath).catch(async () => {
      throw new Error("Test videosu bulunamadı: /tmp/youtube-test.mp4");
    });

    const result = await uploadYoutubeVideo({
      videoPath: testPath,
      title: "AIO-Dijital YouTube bağlantı testi",
      description: "AIO-Dijital YouTube yükleme testi.",
      tags: ["AIO-Dijital", "test"],
      privacyStatus: "private",
    });

    return NextResponse.json({ok: true, channel, video: result});
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, {status: 500});
  }
}
