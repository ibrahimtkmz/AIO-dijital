import { NextResponse } from "next/server";
import { getYoutubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const channel = await getYoutubeChannel();
    return NextResponse.json({ connected: true, channel });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : "YouTube bağlantısı doğrulanamadı.",
    });
  }
}
