export type ScrapingMethod = 'RSS' | 'API' | 'HTML';
export type RssItem = { externalId?: string; url: string; title: string; content: string; imageUrl?: string; publishedAt?: Date };
export type NewsSourceInput = { id: string; name: string; url: string; rssUrl: string | null; category: string | null; scrapingMethod: ScrapingMethod };
export interface NewsSourceAdapter { fetch(source: NewsSourceInput): Promise<RssItem[]>; }
