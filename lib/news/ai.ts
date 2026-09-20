import { NewsItem, ProcessedNews } from "./types";

function words(text: string) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

export async function rewriteForSocial(item: NewsItem): Promise<ProcessedNews> {
  const sourceWords = words(item.content);

  // The video must contain exactly 50 words from the actual article body.
  if (sourceWords.length < 50) {
    throw new Error("Haber metni 50 kelimeye ulaşmıyor; haber atlandı.");
  }

  const socialText = sourceWords.slice(0, 50).join(" ");

  return {
    ...item,
    socialTitle: item.title.trim(),
    socialText,
  };
}
