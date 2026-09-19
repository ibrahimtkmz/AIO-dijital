import { NextResponse } from "next/server";
import { getCanvaAccessToken } from "@/lib/canva-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getCanvaAccessToken();
    return NextResponse.json({ connected: true });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
