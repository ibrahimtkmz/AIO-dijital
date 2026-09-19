import { NewsItem, ProcessedNews } from "./types";
export async function rewriteForSocial(item:NewsItem):Promise<ProcessedNews>{
 const key=process.env.OPENAI_API_KEY;
 if(!key) return {...item,socialTitle:item.title.slice(0,110),socialText:item.content.slice(0,420)};
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6-mini",input:"Haberi Türkçe sosyal medya metnine dönüştür. Bilgi uydurma. JSON: {socialTitle,socialText}.\n"+JSON.stringify(item)})});
 if(!r.ok) throw new Error("AI düzenleme başarısız: "+r.status);
 const d=await r.json(); const p=JSON.parse(d.output_text);
 return {...item,socialTitle:p.socialTitle,socialText:p.socialText};
}