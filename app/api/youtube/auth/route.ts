import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createYoutubeAuthUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = randomBytes(24).toString("hex");
    const url = createYoutubeAuthUrl(state);
    const response = NextResponse.redirect(url);
    response.cookies.set("youtube_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "YouTube OAuth başlatılamadı." },
      { status: 500 },
    );
  }
}
