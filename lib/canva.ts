import {get, put} from "@vercel/blob";
const API="https://api.canva.com/rest/v1";
const DESIGN_ID=process.env.CANVA_TEMPLATE_DESIGN_ID || "DAHVcVHtbvc";
const REFRESH_STATE="canva/oauth-refresh.json";
async function readRefreshToken(){
 const env=process.env.CANVA_REFRESH_TOKEN?.trim(); const blobToken=process.env.BLOB_READ_WRITE_TOKEN;
 if(!blobToken) return env || null;
 try{const r=await get(REFRESH_STATE,{access:"private",token:blobToken}); if(!r?.stream)return env||null; const rd=r.stream.getReader(); const c=[]; while(true){const x=await rd.read();if(x.done)break;if(x.value)c.push(Buffer.from(x.value));} return JSON.parse(Buffer.concat(c).toString()).refresh_token || env || null;}catch{return env||null;}
}
async function saveRefreshToken(refresh_token:string){const token=process.env.BLOB_READ_WRITE_TOKEN;if(token)await put(REFRESH_STATE,JSON.stringify({refresh_token,updatedAt:new Date().toISOString()}),{access:"private",addRandomSuffix:false,token});}
async function refreshAccessToken(){
 const id=process.env.CANVA_CLIENT_ID, secret=process.env.CANVA_CLIENT_SECRET, refresh=await readRefreshToken();
 if(!id||!secret||!refresh)return null;
 const auth=Buffer.from(id+":"+secret).toString("base64");
 const r=await fetch("https://api.canva.com/rest/v1/oauth/token",{method:"POST",headers:{"Authorization":"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:refresh})});
 if(!r.ok)throw new Error("Canva OAuth yenileme hatası: "+r.status+" "+await r.text());
 const d=await r.json(); if(d.refresh_token)await saveRefreshToken(d.refresh_token); return d.access_token;
}
async function api(path:string,init:RequestInit={},retry=true){
 let access=process.env.CANVA_ACCESS_TOKEN?.trim() || await refreshAccessToken();
 if(!access)throw new Error("Canva bağlantısı için CANVA_ACCESS_TOKEN veya CANVA_REFRESH_TOKEN + CANVA_CLIENT_ID + CANVA_CLIENT_SECRET gerekli.");
 const h=new Headers(init.headers); h.set("Authorization","Bearer "+access); if(init.body&&!h.has("Content-Type"))h.set("Content-Type","application/json");
 let r=await fetch(API+path,{...init,headers:h});
 if(r.status===401&&retry){access=await refreshAccessToken();if(access){h.set("Authorization","Bearer "+access);r=await fetch(API+path,{...init,headers:h});}}
 if(!r.ok)throw new Error("Canva API "+r.status+": "+await r.text()); return r.json();
}
async function waitJob(path:string,id:string){for(let i=0;i<40;i++){const d=await api(path+"/"+id);if(d.job?.status==="success")return d.job;if(d.job?.status==="failed")throw new Error(d.job.error?.message||"Canva işlemi başarısız.");await new Promise(r=>setTimeout(r,1500));}throw new Error("Canva işlemi zaman aşımına uğradı.");}
async function uploadImageFromUrl(url:string,name:string){const d=await api("/url-asset-uploads",{method:"POST",body:JSON.stringify({name,url})});const j=await waitJob("/url-asset-uploads",d.job.id);if(!j.asset?.id)throw new Error("Canva görsel asset oluşturamadı.");return j.asset.id;}
export async function getCanvaDataset(){return api("/designs/"+DESIGN_ID+"/dataset");}
export async function createCanvaNewsDesign(input:{title:string;body:string;imageUrl:string}){
 const ds=(await getCanvaDataset()).dataset||{}; const titleField=process.env.CANVA_TITLE_FIELD||"HABER_BASLIK"; const bodyField=process.env.CANVA_BODY_FIELD||"HABER_METNI"; const imageField=process.env.CANVA_IMAGE_FIELD||"HABER_GORSELI";
 const missing=[titleField,bodyField,imageField].filter(k=>!ds[k]); if(missing.length)throw new Error("Canva alanları bulunamadı: "+missing.join(", ")+" | Mevcut: "+Object.keys(ds).join(", "));
 const assetId=await uploadImageFromUrl(input.imageUrl,"haber-"+Date.now()+".jpg");
 const d=await api("/autofills",{method:"POST",body:JSON.stringify({type:"create_from_design",design_id:DESIGN_ID,title:input.title.slice(0,255),data:{[titleField]:{type:"text",text:input.title.slice(0,120)},[bodyField]:{type:"text",text:input.body.slice(0,700)},[imageField]:{type:"image",asset_id:assetId}}})});
 const j=await waitJob("/autofills",d.job.id); const design=j.result?.design; if(!design?.id)throw new Error("Canva doldurulmuş tasarımı oluşturamadı.");
 return {designId:design.id,editUrl:design.urls?.edit_url||design.url,viewUrl:design.urls?.view_url,thumbnailUrl:design.thumbnail?.url};
}