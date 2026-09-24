import {NextResponse} from "next/server";
import {uploadYoutubeVideo} from "@/lib/youtube";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

function clean(value:FormDataEntryValue|null){return typeof value==="string"?value.trim():"";}

export async function POST(request:Request){
 try{
  const form=await request.formData();
  const video=form.get("video");
  if(!(video instanceof File)) return NextResponse.json({error:"video alanında MP4 video gerekli."},{status:400});
  const title=clean(form.get("title"))||video.name.replace(/\.[^.]+$/,"");
  const description=clean(form.get("description"));
  const bytes=Buffer.from(await video.arrayBuffer());
  const tmp="/tmp/manus-youtube-"+Date.now()+".mp4";
  const fs=await import("node:fs/promises");
  await fs.writeFile(tmp,bytes);
  try{
   const result=await uploadYoutubeVideo({videoPath:tmp,title,description,tags:["shorts"],categoryId:"22",privacyStatus:"public"});
   return NextResponse.json({ok:true,videoId:result.videoId,url:result.url});
  }finally{await fs.rm(tmp,{force:true}).catch(()=>undefined)}
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500})}
}