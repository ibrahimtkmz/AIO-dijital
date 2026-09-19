const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tanımlı değil.`);
  return value;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
}

export function getYoutubeCallbackUrl() {
  const base = appUrl();
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL veya APP_URL tanımlı değil.");
  return `${base}/api/youtube/callback`;
}

export function createYoutubeAuthUrl(state: string) {
  const clientId = requiredEnv("YOUTUBE_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getYoutubeCallbackUrl(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: YOUTUBE_SCOPES,
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google OAuth ${response.status}: ${data.error_description || data.error || "token alınamadı"}`);
  }
  return data as TokenResponse;
}

export async function exchangeYoutubeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: requiredEnv("YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("YOUTUBE_CLIENT_SECRET"),
    redirect_uri: getYoutubeCallbackUrl(),
    grant_type: "authorization_code",
  });
  return tokenRequest(body);
}

async function refreshAccessToken() {
  const refreshToken = requiredEnv("YOUTUBE_REFRESH_TOKEN");
  const body = new URLSearchParams({
    client_id: requiredEnv("YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("YOUTUBE_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return tokenRequest(body);
}

export async function getYoutubeAccessToken() {
  const token = await refreshAccessToken();
  return token.access_token;
}

export async function getYoutubeChannel() {
  const accessToken = await getYoutubeAccessToken();
  const response = await fetch(
    `${YOUTUBE_API_URL}/channels?part=snippet&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`YouTube channels.list ${response.status}: ${data.error?.message || "kanal alınamadı"}`);
  }
  const channel = data.items?.[0];
  if (!channel) throw new Error("OAuth hesabına bağlı YouTube kanalı bulunamadı.");
  return {
    id: channel.id as string,
    title: channel.snippet?.title as string,
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url as string | undefined,
  };
}

export type YoutubeUploadInput = {
  videoUrl?: string;
  videoPath?: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "private" | "unlisted" | "public";
};

export async function uploadYoutubeVideo(input: YoutubeUploadInput) {
  const accessToken = await getYoutubeAccessToken();
  let videoBuffer: ArrayBuffer;
  let contentType = "video/mp4";

  if (input.videoPath) {
    const { readFile } = await import("node:fs/promises");
    const file = await readFile(input.videoPath);
    videoBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else if (input.videoUrl) {
    const videoResponse = await fetch(input.videoUrl, { cache: "no-store" });
    if (!videoResponse.ok) {
      throw new Error(`MP4 indirilemedi: HTTP ${videoResponse.status}`);
    }
    videoBuffer = await videoResponse.arrayBuffer();
    contentType = videoResponse.headers.get("content-type") || "video/mp4";
  } else {
    throw new Error("videoPath veya videoUrl gerekli.");
  }
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
      tags: (input.tags || []).slice(0, 30),
      categoryId: input.categoryId || "25",
    },
    status: {
      privacyStatus: input.privacyStatus || "private",
      selfDeclaredMadeForKids: false,
    },
  };

  const initResponse = await fetch(
    `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(videoBuffer.byteLength),
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify(metadata),
      cache: "no-store",
    },
  );

  if (!initResponse.ok) {
    const data = await initResponse.json().catch(() => ({}));
    throw new Error(`YouTube upload başlatılamadı: HTTP ${initResponse.status} ${data.error?.message || ""}`);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube resumable upload URL alınamadı.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
    cache: "no-store",
  });

  const result = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(`YouTube video yüklenemedi: HTTP ${uploadResponse.status} ${result.error?.message || "bilinmeyen hata"}`);
  }

  return {
    videoId: result.id as string,
    url: result.id ? `https://www.youtube.com/shorts/${result.id}` : undefined,
    response: result,
  };
}
