import { ProcessedNews } from "./types";

type CapCutRenderResponse = {
  ok?: boolean;
  videoUrl?: string;
  videoPath?: string;
  draftUrl?: string;
  draftId?: string;
  error?: string;
};

function getBaseUrl() {
  const value = process.env.CAPCUT_API_URL?.trim();
  if (!value) throw new Error("CAPCUT_API_URL tanımlı değil.");
  return value.replace(/\/$/, "");
}

export async function createNewsVideoWithCapCut(item: ProcessedNews) {
  const response = await fetch(`${getBaseUrl()}/render-news`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.CAPCUT_API_KEY ? { authorization: `Bearer ${process.env.CAPCUT_API_KEY}` } : {}),
    },
    body: JSON.stringify({ title: item.socialTitle, body: item.socialText, source: item.source, imageUrl: item.imageUrl, width: 1080, height: 1920, duration: 12 }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as CapCutRenderResponse;
  if (!response.ok || data.ok === false) throw new Error(data.error || `CapCut worker HTTP ${response.status}`);
  if (!data.videoUrl && !data.videoPath) throw new Error("CapCut worker video çıktısı döndürmedi.");
  return { mode: "capcut" as const, videoUrl: data.videoUrl, videoPath: data.videoPath, draftId: data.draftId, draftUrl: data.draftUrl, width: 1080, height: 1920, duration: 12 };
}
