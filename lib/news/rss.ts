import { NewsItem } from "./types";

function stripHtml(value:string){ return value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(); }
function firstTag(xml:string,tag:string){ const m=xml.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)</"+tag+">","i")); return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,"").trim()||""; }
function imageFromItem(item:string){ const m=item.match(/<media:content[^>]+url=["\x27]([^"\x27]+)["\x27]/i); if(m?.[1]) return m[1]; const e=item.match(/<enclosure[^>]+url=["\x27]([^"\x27]+)["\x27]/i); if(e?.[1]) return e[1]; const h=firstTag(item,"description"); return h.match(/<img[^>]+src=["\x27]([^"\x27]+)["\x27]/i)?.[1]||""; }
export async function fetchRssNews(feedUrl:string,limit=10):Promise<NewsItem[]>{
 const response=await fetch(feedUrl,{cache:"no-store"}); if(!response.ok) throw new Error("RSS kaynağı alınamadı: "+response.status);
 const xml=await response.text(); const items=[...xml.matchAll(/<(item|entry)[^>]*>[\s\S]*?<\/(?:item|entry)>/gi)].map(m=>m[0]).slice(0,limit);
 return items.map(item=>{ const title=stripHtml(firstTag(item,"title")); const link=firstTag(item,"link")||item.match(/<link[^>]+href=["\x27]([^"\x27]+)["\x27]/i)?.[1]||""; const content=stripHtml(firstTag(item,"description")||firstTag(item,"summary")||firstTag(item,"content")); const publishedAt=firstTag(item,"pubDate")||firstTag(item,"published")||firstTag(item,"updated")||new Date().toISOString(); const source=new URL(feedUrl).hostname.replace(/^www\./,""); return {sourceUrl:link,title,content,imageUrl:imageFromItem(item),source,publishedAt}; }).filter(x=>x.title&&x.sourceUrl);
}