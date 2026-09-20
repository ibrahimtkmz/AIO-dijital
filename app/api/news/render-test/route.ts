import {NextResponse} from "next/server";
import {fetchRssNews} from "@/lib/news/rss";
import {createNewsVideo} from "@/lib/news/video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({error: "Preview-only test endpoint."}, {status: 404});
  }

  const feed = process.env.NEWS_RSS_URL;
  if (!feed) return NextResponse.json({error: "NEWS_RSS_URL tanımlı değil."}, {status: 500});

  try {
    const [item] = await fetchRssNews(feed, 1);
    if (!item) throw new Error("RSS'ten test haberi alınamadı.");

    const video = await createNewsVideo({
      ...item,
      socialTitle: item.title.slice(0, 120),
      socialText: item.content.slice(0, 620),
    });

    return NextResponse.json({
      ok: true,
      renderer: video.mode,
      bytes: (await import("node:fs/promises")).stat(video.videoPath).then((s) => s.size),
      duration: video.duration,
      width: video.width,
      height: video.height,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, {status: 500});
  }
}
