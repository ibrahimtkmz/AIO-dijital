import { NewsItem, ProcessedNews } from "./types";

function getWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

export async function rewriteForSocial(item: NewsItem): Promise<ProcessedNews> {
  const sourceWords = getWords(item.content);

  if (sourceWords.length < 50) {
    throw new Error("Haber metni 50 kelimeden kısa; haber atlandı.");
  }

  return {
    ...item,
    socialTitle: item.title.trim(),
    socialText: sourceWords.slice(0, 50).join(" "),
  };
}
