import { RssSourceAdapter } from './rss'; import { NewsSourceAdapter, ScrapingMethod } from '../types';
const adapters: Record<ScrapingMethod, NewsSourceAdapter | undefined> = { RSS: new RssSourceAdapter(), API: undefined, HTML: undefined };
export function sourceAdapter(method: ScrapingMethod) { const adapter=adapters[method]; if (!adapter) throw new Error(`${method} adaptörü henüz yapılandırılmadı. HTML yalnızca robots.txt ve kullanım şartları izin verirse eklenmelidir.`); return adapter; }
