import { ProcessedNews } from "./types";
const DESIGN_ID=process.env.CANVA_DESIGN_ID||"DAHVcVHtbvc";
export async function createCanvaDesign(item:ProcessedNews){
 return {mode:"dry-run",designId:DESIGN_ID,fields:{HABER_BASLIK:item.socialTitle,HABER_METNI:item.socialText,HABER_GORSELI:item.imageUrl}};
}