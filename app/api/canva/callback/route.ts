import { NextRequest, NextResponse } from "next/server";
import { exchangeCanvaCode } from "@/lib/canva-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/haber-otomasyonu?canva=error&message=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/haber-otomasyonu?canva=error&message=Eksik+OAuth+parametresi", request.url),
    );
  }

  try {
    await exchangeCanvaCode(code, state);
    return NextResponse.redirect(new URL("/haber-otomasyonu?canva=connected", request.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Canva bağlantısı başarısız.";
    console.error("[canva/callback]", message);
    return NextResponse.redirect(
      new URL(`/haber-otomasyonu?canva=error&message=${encodeURIComponent(message)}`, request.url),
    );
  }
}
