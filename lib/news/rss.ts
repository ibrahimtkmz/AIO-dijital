import { NewsItem } from "./types";

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(xml: string, tag: string) {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\s\S]*?)</" + tag + ">", "i"));
  return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
}

function imageFromItem(item: string) {
  const m = item.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (m?.[1]) return m[1];
  const e = item.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (e?.[1]) return e[1];
  const h = firstTag(item, "description");
  return h.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
}



async function fetchArticleDetails(pageUrl: string) {
  const response = await fetch(pageUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) return {content: "", imageUrl: ""};

  const html = await response.text();
  const base = new URL(pageUrl);

  // SonDakika'nın haber sayfasındaki asıl öne çıkan görsel:
  // <img ... id="haberResim" src="...">
  const haberImage =
    html.match(/<img[^>]+id=["']haberResim["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
    html.match(/<img[^>]+src=["']([^"']+)["'][^>]+id=["']haberResim["']/i)?.[1] ||
    "";

  // SonDakika'nın haber özeti: class="mt10 haber_ozet"
  const summaryMatch =
    html.match(/<[^>]*class=["'][^"']*\bmt10\b[^"']*\bhaber_ozet\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
    html.match(/<[^>]*class=["'][^"']*\bhaber_ozet\b[^"']*\bmt10\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);

  const summary = summaryMatch?.[1] ? stripHtml(summaryMatch[1]) : "";

  // Sadece bu özet kullanılır. Bulunamazsa mevcut structured/meta içeriğe kontrollü fallback.
  let fallback = "";
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (typeof node?.description === "string" && node.description.length > fallback.length) {
          fallback = stripHtml(node.description);
        }
        if (typeof node?.articleBody === "string" && node.articleBody.length > fallback.length) {
          fallback = stripHtml(node.articleBody);
        }
      }
    } catch {}
  }

  const metaDescription =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
    "";

  return {
    content: summary || fallback || stripHtml(metaDescription),
    imageUrl: haberImage ? new URL(haberImage, base).href : "",
  };
}

async function fetchHtmlNews(pageUrl: string, limit = 1): Promise<NewsItem[]> {
  const response = await fetch(pageUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIO-Dijital/1.0; +https://aio-dijital.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error("Haber kaynağı alınamadı: " + response.status);
  }

  const html = await response.text();
  const base = new URL(pageUrl);
  const seen = new Set<string>();
  const results: NewsItem[] = [];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1];
    const raw = match[2];
    const title = stripHtml(raw);

    if (!title || title.length < 20 || title.length > 220) continue;
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;

    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }

    if (url.hostname !== base.hostname) continue;
    if (!/\/(haber|son-dakika-haberleri)\//i.test(url.pathname)) continue;
    if (seen.has(url.href)) continue;

    seen.add(url.href);

    const offset = match.index ?? 0;
    const parentChunk = html.slice(Math.max(0, offset - 1200), Math.min(html.length, offset + raw.length + 1200));
    const imageUrl =
      parentChunk.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)?.[1] || "";

    results.push({
      sourceUrl: url.href,
      title,
      content: title,
      imageUrl: imageUrl ? new URL(imageUrl, base).href : "",
      source: base.hostname.replace(/^www\./, ""),
      publishedAt: new Date().toISOString(),
    });

    if (results.length >= limit) break;
  }

  return results;
}

export async function fetchRssNews(feedUrl: string, limit = 1): Promise<NewsItem[]> {
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
      .slice(0, limit);

    const parsed = [] as NewsItem[];
    for (const item of items) {
        const title = stripHtml(firstTag(item, "title"));
        const link =
          firstTag(item, "link") ||
          item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
          "";
        const content = stripHtml(
          firstTag(item, "content:encoded") ||
            firstTag(item, "description") ||
            firstTag(item, "summary") ||
            firstTag(item, "content")
        );
        const publishedAt =
          firstTag(item, "pubDate") ||
          firstTag(item, "published") ||
          firstTag(item, "updated") ||
          new Date().toISOString();

        if (!title || !link) continue;
        const article = await fetchArticleDetails(link);
        parsed.push({
          sourceUrl: link,
          title,
          content: article.content || content,
          imageUrl: article.imageUrl || imageFromItem(item),
          source: new URL(normalizedFeedUrl).hostname.replace(/^www\./, ""),
          publishedAt,
        });
      }

    if (parsed.length) return parsed;
  }

  return fetchHtmlNews("https://www.sondakika.com/", limit);
}
