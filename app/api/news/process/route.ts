import { NextResponse } from "next/server";
import { fetchRssNews } from "@/lib/news/rss";
import { rewriteForSocial } from "@/lib/news/ai";
import { createNewsVideo } from "@/lib/news/video";
import { hasNews, saveNews } from "@/lib/news/store";
import { uploadYoutubeVideo } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const feed = process.env.NEWS_RSS_URL;
  if (!feed) return NextResponse.json({ error: "NEWS_RSS_URL tanımlı değil." }, { status: 400 });

  try {
    const news = await fetchRssNews(feed, 10);
    console.log("[news] fetched", { count: news.length });

    const results = [];

    for (const item of news) {
      if (hasNews(item.sourceUrl)) continue;

      saveNews({
        sourceUrl: item.sourceUrl,
        title: item.title,
        source: item.source,
        imageUrl: item.imageUrl,
        status: "processing",
        updatedAt: new Date().toISOString(),
      });

      try {
        console.log("[news] processing", { url: item.sourceUrl, imageUrl: item.imageUrl });
        const social = await rewriteForSocial(item);
        console.log("[news] ai complete", { url: item.sourceUrl });

        const video = await createNewsVideo(social);
        console.log("[news] video complete", { url: item.sourceUrl, duration: video.duration });

        let youtube: { videoId: string; url?: string } | undefined;
        if (process.env.AUTO_PUBLISH !== "false") {
          youtube = await uploadYoutubeVideo({
            videoPath: video.videoPath,
            title: social.socialTitle,
            description: social.socialText,
            tags: ["haber", "gündem", "shorts"],
            categoryId: "25",
            privacyStatus: "public",
          });
          console.log("[news] youtube complete", { url: item.sourceUrl, videoId: youtube.videoId });
        }

        results.push({ item, social, video: { ...video, videoPath: undefined }, youtube });
        saveNews({
          sourceUrl: item.sourceUrl,
          title: item.title,
          source: item.source,
          imageUrl: item.imageUrl,
          status: youtube ? "youtube_published" : "ready",
          updatedAt: new Date().toISOString(),
          youtubeVideoId: youtube?.videoId,
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("[news] item failed", {
          url: item.sourceUrl,
          imageUrl: item.imageUrl,
          error: errorMessage,
          stack: e instanceof Error ? e.stack : undefined,
        });
        saveNews({
          sourceUrl: item.sourceUrl,
          title: item.title,
          source: item.source,
          imageUrl: item.imageUrl,
          status: "failed",
          updatedAt: new Date().toISOString(),
        });
        results.push({ item, error: errorMessage });
      }
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[news] process failed", { error: errorMessage, stack: e instanceof Error ? e.stack : undefined });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const GET = POST;
