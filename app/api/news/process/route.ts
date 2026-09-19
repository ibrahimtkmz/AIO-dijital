import { NextResponse } from "next/server";
import { fetchRssNews } from "@/lib/news/rss";
import { rewriteForSocial } from "@/lib/news/ai";
import { createCanvaDesign, exportCanvaMp4 } from "@/lib/news/canva";
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
        const canva = await createCanvaDesign(social);
        let youtube: { videoId: string; url?: string } | undefined;

        if (process.env.AUTO_PUBLISH === "true") {
          if (canva.mode !== "live") throw new Error("AUTO_PUBLISH=true için CANVA_ACCESS_TOKEN gerekli.");
          const mp4 = await exportCanvaMp4(canva.designId);
          if (mp4.mode !== "live") throw new Error("Canva MP4 export canlı değil.");
          youtube = await uploadYoutubeVideo({
            videoUrl: mp4.downloadUrl,
            title: social.socialTitle,
            description: social.socialText,
            tags: ["haber", "gündem", "shorts"],
            categoryId: "25",
            privacyStatus: "private",
          });
        }

        results.push({ item, social, canva, youtube });
        saveNews({
          sourceUrl: item.sourceUrl,
          title: item.title,
          source: item.source,
          imageUrl: item.imageUrl,
          status: youtube ? "youtube_published" : "ready",
          updatedAt: new Date().toISOString(),
          canvaDesignId: canva.designId,
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
