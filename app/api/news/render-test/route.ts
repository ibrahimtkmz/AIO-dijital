import {NextResponse} from "next/server";
import {fetchRssNews} from "@/lib/news/rss";
import {createNewsVideo} from "@/lib/news/video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TEST_TEMPLATE = "https://assets.testfiles.dev/video/sample-3s.mp4";

export async function GET() {
  const previous = process.env.NEWS_TEMPLATE_VIDEO_URL;
  process.env.NEWS_TEMPLATE_VIDEO_URL = TEST_TEMPLATE;
  try {
    const [item] = await fetchRssNews(process.env.NEWS_RSS_URL || "https://rss.sondakika.com/", 1);
    if (!item) throw new Error("Test için RSS haberi alınamadı.");
    const video = await createNewsVideo({
      ...item,
      socialTitle: "Remotion smoke test başlığı",
      socialText: "Bu video gerçek Vercel Sandbox üzerinde Remotion render testidir.",
    });
    return NextResponse.json({
      ok: true,
      renderer: video.mode,
      width: video.width,
      height: video.height,
      duration: video.duration,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, {status: 500});
  } finally {
    if (previous === undefined) delete process.env.NEWS_TEMPLATE_VIDEO_URL;
    else process.env.NEWS_TEMPLATE_VIDEO_URL = previous;
  }
}
