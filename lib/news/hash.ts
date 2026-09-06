import { createHash } from 'crypto';
export function normalizedUrl(url: string) { const value = new URL(url); value.hash = ''; for (const key of [...value.searchParams.keys()]) if (/^(utm_|fbclid$)/i.test(key)) value.searchParams.delete(key); return value.toString(); }
export function newsHash(url: string, content: string) { return createHash('sha256').update(`${normalizedUrl(url)}\n${content.trim().replace(/\s+/g, ' ')}`).digest('hex'); }
