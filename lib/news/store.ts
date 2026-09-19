import { NewsStatus } from "./types";
export type NewsRecord = { sourceUrl:string; title:string; source:string; imageUrl:string; status:NewsStatus; updatedAt:string; canvaDesignId?:string; youtubeVideoId?:string };
const records = new Map<string, NewsRecord>();
export function hasNews(url:string){ return records.has(url); }
export function saveNews(record:NewsRecord){ records.set(record.sourceUrl,record); return record; }
export function listNews(){ return [...records.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }