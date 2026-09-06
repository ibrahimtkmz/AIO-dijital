/** Server-side storage abstraction; Vercel's ephemeral filesystem is never used for MP4 persistence. */
export interface ObjectStorage { putStream(key:string,stream:ReadableStream<Uint8Array>,contentType:string):Promise<{key:string;url:string}>; getSignedUrl(key:string):Promise<string>; }
