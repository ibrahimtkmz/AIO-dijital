import { NextResponse } from "next/server";
import { fetchRssNews } from "@/lib/news/rss";
import { rewriteForSocial } from "@/lib/news/ai";
import { createCanvaDesign } from "@/lib/news/canva";
import { hasNews,saveNews } from "@/lib/news/store";
export const dynamic="force-dynamic";
export async function POST(){
 const feed=process.env.NEWS_RSS_URL; if(!feed) return NextResponse.json({error:"NEWS_RSS_URL tanımlı değil."},{status:400});
 try{ const news=await fetchRssNews(feed,10); const results=[]; for(const item of news){ if(hasNews(item.sourceUrl)) continue; saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"processing",updatedAt:new Date().toISOString()}); try{ const social=await rewriteForSocial(item); const canva=await createCanvaDesign(social); results.push({item,social,canva}); saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"ready",updatedAt:new Date().toISOString(),canvaDesignId:canva.designId}); }catch(e){ saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"failed",updatedAt:new Date().toISOString()}); results.push({item,error:e instanceof Error?e.message:"Bilinmeyen hata"}); }} return NextResponse.json({ok:true,count:results.length,results}); }
 catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"İşlem başarısız."},{status:500}); }
}
export const GET=POST;