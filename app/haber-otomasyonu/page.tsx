"use client";
import {useEffect,useState} from "react";
type YoutubeState={connected:boolean;channel?:{title:string};error?:string};
export default function Page(){
 const [youtube,setYoutube]=useState<YoutubeState>({connected:false});
 const [video,setVideo]=useState<File|null>(null); const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
 const [loading,setLoading]=useState(false); const [msg,setMsg]=useState("");
 async function refresh(){const r=await fetch("/api/youtube/status",{cache:"no-store"});setYoutube(await r.json());}
 async function upload(){if(!video){setMsg("Önce MP4 video seç.");return} setLoading(true);setMsg(""); try{const form=new FormData();form.append("video",video);form.append("title",title||video.name.replace(/\.mp4$/i,""));form.append("description",description);const r=await fetch("/api/youtube/upload",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"Video yüklenemedi.");setMsg("YouTube'a yüklendi: "+(d.url||d.videoId));}catch(e){setMsg(e instanceof Error?e.message:"Video yüklenemedi.");}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[]);
 return <main style={{maxWidth:900,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}><h1>YouTube Video Otomasyonu</h1><p>Manus AI tarafından hazırlanan videoyu API'ye gönder; sistem doğrudan YouTube Shorts olarak yüklesin.</p>
 <section style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginTop:20}}><h2>YouTube Kanalı</h2><p>{youtube.connected?"Bağlı: "+(youtube.channel?.title||"kanal"):"Kanal bağlı değil."}</p><button onClick={()=>window.location.assign("/api/youtube/auth")}>Yeni YouTube Kanalı Bağla</button></section>
 <section style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginTop:20}}><h2>Video Gönder</h2><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e=>setVideo(e.target.files?.[0]||null)}/><input style={{display:"block",width:"100%",marginTop:12,padding:10}} placeholder="YouTube başlığı" value={title} onChange={e=>setTitle(e.target.value)}/><textarea style={{display:"block",width:"100%",marginTop:12,padding:10,minHeight:120}} placeholder="Açıklama (opsiyonel)" value={description} onChange={e=>setDescription(e.target.value)}/><button style={{marginTop:12}} onClick={upload} disabled={loading}>{loading?"YouTube'a yükleniyor...":"YouTube'a Yükle"}</button></section>
 <section style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginTop:20}}><h2>Manus AI</h2><p><code>POST /api/manus/youtube</code> adresine multipart/form-data ile <code>video</code>, <code>title</code>, <code>description</code> gönderebilir.</p><p>API erişimi <code>MANUS_WEBHOOK_SECRET</code> ile korunur.</p></section><p>{msg}</p></main>
}