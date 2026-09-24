import {NextResponse} from "next/server";
import {fetchRssNews} from "@/lib/news/rss";
import {rewriteForSocial} from "@/lib/news/ai";
import {hasNews,saveNews} from "@/lib/news/store";
import {createCanvaNewsDesign} from "@/lib/canva";
import {notifyReady} from "@/lib/notify";
export const dynamic="force-dynamic"; export const maxDuration=300;
export async function POST(){const feed=process.env.NEWS_RSS_URL;if(!feed)return NextResponse.json({error:"NEWS_RSS_URL tanımlı değil."},{status:400});try{
 const news=await fetchRssNews(feed,10); const candidates=news.filter(x=>!hasNews(x.sourceUrl)).slice(0,5); const results=[];
 for(const item of candidates){saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"processing",updatedAt:new Date().toISOString()});try{
  const social=await rewriteForSocial(item); const canva=await createCanvaNewsDesign({title:social.socialTitle,body:social.socialText,imageUrl:social.imageUrl});
  saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"canva_created",updatedAt:new Date().toISOString(),canvaDesignId:canva.designId,canvaEditUrl:canva.editUrl,canvaViewUrl:canva.viewUrl});
  results.push({item,social,canva});
 }catch(e){const msg=e instanceof Error?e.message:String(e);saveNews({sourceUrl:item.sourceUrl,title:item.title,source:item.source,imageUrl:item.imageUrl,status:"failed",updatedAt:new Date().toISOString()});results.push({item,error:msg});}}
 const ready=results.filter(x=>"canva" in x).map(x=>({title:x.item.title,editUrl:x.canva.editUrl})); if(ready.length)await notifyReady(ready).catch(e=>console.error("[notify] failed",e));
 return NextResponse.json({ok:true,count:results.length,results});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500});}}
export const GET=POST;
