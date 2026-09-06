export type YoutubeMetadata={title:string;description:string;tags:string[];categoryId:string;privacyStatus:'private'|'unlisted'|'public'};
export interface YoutubeService { upload(videoUrl:string,metadata:YoutubeMetadata):Promise<{videoId:string;url:string}>; }
