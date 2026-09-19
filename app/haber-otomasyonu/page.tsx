"use client";
import {useEffect,useState} from "react";
type Item={title:string;source:string;status:string;updatedAt:string};
export default function Page(){
 const [items,setItems]=useState<Item[]>([]); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState("");
 async function refresh(){const r=await fetch("/api/news/status",{cache:"no-store"});setItems((await r.json()).items||[]);}
 async function processNews(){setLoading(true);try{const r=await fetch("/api/news/process",{method:"POST"});const d=await r.json();setMsg(d.error||(d.ok?d.count+" yeni haber işlendi.":"İşlem tamamlanamadı."));await refresh();}finally{setLoading(false);}}
 useEffect(()=>{refresh()},[]);
 return <main style={{maxWidth:1100,margin:"40px auto",padding:20}}><h1>Haber Otomasyonu</h1><p>RSS → AI → Canva hazırlığı</p><button onClick={processNews} disabled={loading}>{loading?"İşleniyor...":"Yeni Haberleri Getir"}</button><p>{msg}</p><table style={{width:"100%",marginTop:20}}><thead><tr><th>Haber</th><th>Kaynak</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>{items.map(x=><tr key={x.title}><td>{x.title}</td><td>{x.source}</td><td>{x.status}</td><td>{new Date(x.updatedAt).toLocaleString("tr-TR")}</td></tr>)}</tbody></table></main>;
}