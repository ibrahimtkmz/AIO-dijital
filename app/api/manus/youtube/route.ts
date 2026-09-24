import {NextResponse} from "next/server";
import {uploadYoutubeVideo} from "@/lib/youtube";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

function authorized(request:Request){
 const expected=process.env.MANUS_WEBHOOK_SECRET;
 if(!expected) throw new Error("MANUS_WEBHOOK_SECRET tanımlı değil.");
 return request.headers.get("authorization")===("Bearer "+expected) || request.headers.get("x-manus-secret")===expected;
}

export async function POST(request:Request){
 if(!authorized(request)) return NextResponse.json({error:"Yetkisiz."},{status:401});
 try{
  const type=request.headers.get("content-type")||"";
  let title="Yeni YouTube Short",description="",videoPath="";
  const fs=await import("node:fs/promises");
  if(type.includes("application/json")){
   const body=await request.json();
   if(!body.videoUrl) return NextResponse.json({error:"videoUrl gerekli."},{status:400});
   title=String(body.title||title);
   description=String(body.description||"");
   const response=await fetch(String(body.videoUrl),{cache:"no-store"});
   if(!response.ok) throw new Error("Manus video URL indirilemedi: HTTP "+response.status);
   videoPath="/tmp/manus-"+Date.now()+".mp4";
   await fs.writeFile(videoPath,Buffer.from(await response.arrayBuffer()));
  }else{
   const form=await request.formData();
   const video=form.get("video");
   if(!(video instanceof File)) return NextResponse.json({error:"video veya videoUrl gerekli."},{status:400});
   title=String(form.get("title")||title);
   description=String(form.get("description")||"");
   videoPath="/tmp/manus-"+Date.now()+".mp4";
   await fs.writeFile(videoPath,Buffer.from(await video.arrayBuffer()));
  }
  try{
   const result=await uploadYoutubeVideo({videoPath,title,description,tags:["shorts"],categoryId:"22",privacyStatus:"public"});
   return NextResponse.json({ok:true,videoId:result.videoId,url:result.url});
  }finally{await fs.rm(videoPath,{force:true}).catch(()=>undefined)}
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500})}
}