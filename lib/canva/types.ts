export type CanvaTemplateFields={TITLE:string;CONTENT:string;IMAGE?:string;CATEGORY?:string;DATE:string};
export interface CanvaService { autofill(templateId:string,fields:CanvaTemplateFields):Promise<{designId:string}>; exportVideo(designId:string):Promise<{downloadUrl:string}>; }
