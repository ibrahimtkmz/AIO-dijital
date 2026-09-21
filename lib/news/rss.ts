import {NewsItem} from "./types";

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(xml: string, tag: string) {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m?.[1] ? stripHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "")) : "";
}

function meta(html: string, key: string) {
  const a = html.match(new RegExp("<meta[^>]+(?:property|name)=[\\\"']" + key + "[\\\"'][^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]*>", "i"));
  const b = html.match(new RegExp("<meta[^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]+(?:property|name)=[\\\"']" + key + "[\\\"'][^>]*>", "i"));
  return a?.[1] || b?.[1] || "";
}

function normalizeImage(value: string, base: URL) {
  if (!value) return "";
  try {
    const url = new URL(value.replace(/&amp;/g, "&"), base);
    if (!/^https?:$/i.test(url.protocol)) return "";
    if (/slider_saat|logo|favicon|placeholder|no[-_ ]?image/i.test(url.pathname)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function usefulSummary(value: string, title: string) {
  const text = stripHtml(value);
  if (text.length < 60) return false;
  const t = title.toLocaleLowerCase("tr-TR").replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
  const s = text.toLocaleLowerCase("tr-TR").replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
  return s.length >= 60 && s !== t;
}

async function fetchArticleDetails(pageUrl: string, title: string) {
  const response = await fetch(pageUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) return {summary: "", imageUrl: ""};

  const html = await response.text();
  const base = new URL(pageUrl);

  const imageUrl =
    normalizeImage(html.match(/<img[^>]+id=[\"']haberResim[\"'][^>]+src=[\"']([^\"']+)/i)?.[1] || "", base) ||
    normalizeImage(html.match(/<img[^>]+src=[\"']([^\"']+)[\"'][^>]+id=[\"']haberResim[\"']/i)?.[1] || "", base) ||
    normalizeImage(meta(html, "og:image"), base) ||
    normalizeImage(meta(html, "twitter:image"), base);

  const candidates = [
    meta(html, "description"),
    meta(html, "og:description"),
  ].map(stripHtml).filter((v) => usefulSummary(v, title));

  for (const match of html.matchAll(/<script[^>]+type=[\"']application\\/ld\\+json[\"'][^>]*>([\\s\\S]*?)<\\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (typeof node?.description === "string") {
          const value = stripHtml(node.description);
          if (usefulSummary(value, title)) candidates.push(value);
        }
      }
    } catch {}
  }

  candidates.sort((a, b) => b.length - a.length);
  return {summary: candidates[0] || "", imageUrl};
}

function imageFromItem(item: string) {
  return (
    item.match(/<media:content[^>]+url=[\"']([^\"']+)/i)?.[1] ||
    item.match(/<enclosure[^>]+url=[\"']([^\"']+)/i)?.[1] ||
    ""
  );
}

export async function fetchRssNews(feedUrl: string, limit = 10): Promise<NewsItem[]> {
  const normalizedFeedUrl =
    feedUrl === "https://rss.sondakika.com/" || feedUrl === "https://rss.sondakika.com"
      ? "https://rss.sondakika.com/rssnew.aspx"
      : feedUrl;

  const response = await fetch(normalizedFeedUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9",
    },
  });

  if (response.ok) {
    const xml = await response.text();
    const items = [...xml.matchAll(/<(item|entry)[^>]*>[\s\S]*?<\/(?:item|entry)>/gi)]
      .map((m) => m[0])
      .slice(0, Math.max(limit, 10));

    const parsed: NewsItem[] = [];

    for (const item of items) {
      if (parsed.length >= limit) break;
      const title = firstTag(item, "title");
      const link = firstTag(item, "link") || item.match(/<link[^>]+href=[\"']([^\"']+)/i)?.[1] || "";
      if (!title || !link) continue;

      const article = await fetchArticleDetails(link, title);
      const imageUrl = article.imageUrl || normalizeImage(imageFromItem(item), new URL(link));

      if (!article.summary || !imageUrl) {
        console.warn("[news] skipping incomplete source item", {
          title,
          hasSummary: Boolean(article.summary),
          hasImage: Boolean(imageUrl),
          link,
        });
        continue;
      }

      parsed.push({
        sourceUrl: link,
        title,
        content: article.summary,
        imageUrl,
        source: new URL(link).hostname.replace(/^www\./, ""),
        publishedAt:
          firstTag(item, "pubDate") ||
          firstTag(item, "published") ||
          firstTag(item, "updated") ||
          new Date().toISOString(),
      });
    }

    if (parsed.length) return parsed;
  }

  throw new Error("SonDakika kaynağından başlık + özet + haber görseli birlikte alınamadı.");
}
