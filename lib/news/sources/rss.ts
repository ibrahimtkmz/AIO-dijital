import { fetchRss } from '../rss/fetcher'; import { NewsSourceAdapter, NewsSourceInput, RssItem } from '../types';
export class RssSourceAdapter implements NewsSourceAdapter { async fetch(source: NewsSourceInput): Promise<RssItem[]> { if (!source.rssUrl) throw new Error(`${source.name} için RSS URL tanımlı değil.`); return fetchRss(source.rssUrl); } }
