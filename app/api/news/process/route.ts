import { NextResponse } from "next/server";
import { fetchRssNews } from "@/lib/news/rss";
import { rewriteForSocial } from "@/lib/news/ai";
import { createNewsVideo } from "@/lib/news/video";
import { hasNews, saveNews } from "@/lib/news/store";
import { uploadYoutubeVideo } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function POST() {
  const feed = process.env.NEWS_RSS_URL;
  if (!feed) return NextResponse.json({ error: "NEWS_RSS_URL tanımlı değil." }, { status: 400 });

  try {
    const news = await fetchRssNews(feed, 10);
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
        const social = await rewriteForSocial(item);
        const video = await createNewsVideo(social);
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
        saveNews({
          sourceUrl: item.sourceUrl,
          title: item.title,
          source: item.source,
          imageUrl: item.imageUrl,
          status: "failed",
          updatedAt: new Date().toISOString(),
        });
        results.push({ item, error: e instanceof Error ? e.message : "Bilinmeyen hata" });
      }
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "İşlem başarısız." },
      { status: 500 },
    );
  }
}

export const GET = POST;
