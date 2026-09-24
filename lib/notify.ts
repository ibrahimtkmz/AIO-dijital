export async function notifyReady(items:Array<{title:string;editUrl?:string}>){
 const token=process.env.TELEGRAM_BOT_TOKEN?.trim(); const chat=process.env.TELEGRAM_CHAT_ID?.trim(); if(!token||!chat)return;
 const text=["📰 Yeni haber tasarımları hazır!",...items.map(x=>"• "+x.title+(x.editUrl?"\n  "+x.editUrl:""))].join("\n");
 await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chat,text})});
}
