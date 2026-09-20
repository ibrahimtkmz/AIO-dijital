import { NewsItem, ProcessedNews } from "./types";

function getWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

export async function rewriteForSocial(item: NewsItem): Promise<ProcessedNews> {
  const sourceWords = getWords(item.content);

  const fallbackText = sourceWords.length
    ? sourceWords.join(" ")
    : item.title.trim();

  return {
    ...item,
    socialTitle: item.title.trim(),
    socialText: fallbackText.slice(0, 620),
  };
}
