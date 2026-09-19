import { NextResponse } from "next/server";
import { getCanvaAccessToken } from "@/lib/canva-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getCanvaAccessToken();
    return NextResponse.json({ connected: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Canva bağlantısı kontrol edilemedi.";
    console.error("[canva/status]", error);
    return NextResponse.json(
      { connected: false, error },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
