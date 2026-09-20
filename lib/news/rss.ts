import { NewsItem } from "./types";

function stripHtml(value: string) {
  return value
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\\s+/g, " ")
    .trim();
}

function firstTag(xml: string, tag: string) {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m?.[1]?.replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() || "";
}

function normalizeImage(url: string, base: URL) {
  if (!url) return "";
  try { return new URL(url, base).href; } catch { return ""; }
}

function imageFromItem(item: string, base: URL) {
  const m = item.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (m?.[1]) return normalizeImage(m[1], base);
  const e = item.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (e?.[1]) return normalizeImage(e[1], base);
  const h = firstTag(item, "description");
  const img = h.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)?.[1] || "";
  return normalizeImage(img, base);
}

async function fetchArticleContent(pageUrl: string) {
  const response = await fetch(pageUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) return "";
  const html = await response.text();

  const blocks = [
    ...html.matchAll(/<article\\b[^>]*>([\\s\\S]*?)<\\/article>/gi),
    ...html.matchAll(/<div[^>]+(?:class|id)=["'][^"']*(?:article|news-content|news-detail|haber-icerik|haber-metin|content-body|detail-content)[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/gi),
  ];

  const candidates = blocks
    .map((m) => stripHtml(m[1] || ""))
    .filter((x) => x.length >= 200)
    .sort((a, b) => b.length - a.length);

  if (candidates[0]) return candidates[0];

  const paragraphs = [...html.matchAll(/<p\\b[^>]*>([\\s\\S]*?)<\\/p>/gi)]
    .map((m) => stripHtml(m[1] || ""))
    .filter((x) => x.length >= 35);

  return paragraphs.join(" ").replace(/\\s+/g, " ").trim();
}

async function fetchHtmlNews(pageUrl: string, limit = 1): Promise<NewsItem[]> {
  const response = await fetch(pageUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) throw new Error("Haber kaynağı alınamadı: " + response.status);

  const html = await response.text();
  const base = new URL(pageUrl);
  const seen = new Set<string>();
  const results: NewsItem[] = [];
  const linkRegex = /<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi;

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1];
    const title = stripHtml(match[2]);
    if (!title || title.length < 20 || title.length > 220) continue;
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;

    let url: URL;
    try { url = new URL(href, base); } catch { continue; }
    if (url.hostname !== base.hostname || !/\\/(haber|son-dakika-haberleri)\\//i.test(url.pathname)) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    const articleContent = await fetchArticleContent(url.href);
    const offset = match.index ?? 0;
    const parentChunk = html.slice(Math.max(0, offset - 1600), Math.min(html.length, offset + match[0].length + 1600));
    const imageUrl = normalizeImage(
      parentChunk.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)?.[1] || "",
      base
    );

    results.push({
      sourceUrl: url.href,
      title,
      content: articleContent,
      imageUrl,
      source: base.hostname.replace(/^www\\./, ""),
      publishedAt: new Date().toISOString(),
    });

    if (results.length >= limit) break;
  }

  return results;
}

export async function fetchRssNews(feedUrl: string, limit = 1): Promise<NewsItem[]> {
  const response = await fetch(feedUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9",
    },
  });

  if (response.ok) {
    const xml = await response.text();
    const items = [...xml.matchAll(/<(item|entry)[^>]*>[\\s\\S]*?<\\/(?:item|entry)>/gi)]
      .map((m) => m[0])
      .slice(0, Math.max(1, limit));

    const parsed: NewsItem[] = [];
    for (const item of items) {
      const title = stripHtml(firstTag(item, "title"));
      const link = firstTag(item, "link") || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";
      if (!title || !link) continue;

      const publishedAt = firstTag(item, "pubDate") || firstTag(item, "published") || firstTag(item, "updated") || new Date().toISOString();
      const content = await fetchArticleContent(link);
      parsed.push({
        sourceUrl: link,
        title,
        content,
        imageUrl: imageFromItem(item, new URL(feedUrl)),
        source: new URL(feedUrl).hostname.replace(/^www\\./, ""),
        publishedAt,
      });
    }

    if (parsed.length) return parsed;
  }

  return fetchHtmlNews("https://www.sondakika.com/", limit);
}
