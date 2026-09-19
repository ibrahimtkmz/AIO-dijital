export type NewsStatus =
  | "detected"
  | "processing"
  | "canva_created"
  | "ready"
  | "instagram_published"
  | "youtube_published"
  | "failed";

export type NewsItem = {
  sourceUrl: string;
  title: string;
  content: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
};

export type ProcessedNews = NewsItem & {
  socialTitle: string;
  socialText: string;
};