import { NextResponse } from "next/server";
import { getCanvaAccessToken } from "@/lib/canva-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accessToken = await getCanvaAccessToken();
    const response = await fetch(
      "https://api.canva.com/rest/v1/users/me/capabilities",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: true,
          canvaStatus: response.status,
          error: data?.message || "Canva yetenekleri alınamadı.",
          data,
        },
        { status: response.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Canva bağlantısı kontrol edilemedi.";
    console.error("[canva/capabilities]", error);
    return NextResponse.json(
      { connected: false, error },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
