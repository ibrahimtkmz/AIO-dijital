import { NewsItem, ProcessedNews } from "./types";

function firstWords(text: string, count: number) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

export async function rewriteForSocial(item: NewsItem): Promise<ProcessedNews> {
  return {
    ...item,
    // Video uses the original headline and the first 50 words of the source article.
    socialTitle: item.title.trim(),
    socialText: firstWords(item.content, 50),
  };
}
