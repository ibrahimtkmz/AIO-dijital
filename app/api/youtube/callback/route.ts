import { NextResponse } from "next/server";
import { exchangeYoutubeCode, getYoutubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `Google OAuth reddedildi: ${error}` }, { status: 400 });
  }

  const cookieState = request.headers.get("cookie")?.match(/(?:^|; )youtube_oauth_state=([^;]+)/)?.[1];
  if (!returnedState || !cookieState || returnedState !== cookieState) {
    return NextResponse.json({ error: "OAuth state doğrulaması başarısız." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Google authorization code göndermedi." }, { status: 400 });
  }

  try {
    const tokens = await exchangeYoutubeCode(code);
    const channel = await getYoutubeChannelWithAccessToken(tokens.access_token);

    const refreshToken = tokens.refresh_token;
    const response = new NextResponse(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>YouTube Bağlandı</title>
      <style>body{font-family:Arial,sans-serif;max-width:760px;margin:60px auto;padding:20px;line-height:1.6}code{display:block;padding:14px;background:#f3f3f3;word-break:break-all;border-radius:8px}a{color:#06c}</style>
      </head><body><h1>YouTube bağlantısı başarılı</h1>
      <p>Kanal: <strong>${escapeHtml(channel.title)}</strong></p>
      ${refreshToken
        ? `<p>Aşağıdaki refresh token'ı <strong>Vercel → Settings → Environment Variables</strong> bölümünde <code>YOUTUBE_REFRESH_TOKEN</code> olarak ekle. Bu token'ı GitHub'a veya sohbet mesajına gönderme.</p><code>${escapeHtml(refreshToken)}</code>`
        : "<p>Google yeni refresh token döndürmedi. Mevcut refresh token kullanılıyorsa onu değiştirmene gerek yok.</p>"}
      <p><a href="/haber-otomasyonu">Haber Otomasyonu'na dön</a></p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
    response.cookies.delete("youtube_oauth_state");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "YouTube OAuth callback başarısız." },
      { status: 500 },
    );
  }
}

async function getYoutubeChannelWithAccessToken(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "YouTube kanalı doğrulanamadı.");
  }
  const channel = data.items?.[0];
  if (!channel) throw new Error("OAuth hesabına bağlı YouTube kanalı bulunamadı.");
  return { title: channel.snippet?.title || "YouTube kanalı" };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char] || char));
}
