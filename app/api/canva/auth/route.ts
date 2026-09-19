import { NextResponse } from "next/server";
import { createCanvaAuthorization, storeOAuthCookies } from "@/lib/canva-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { url, state, verifier } = createCanvaAuthorization();
  await storeOAuthCookies(state, verifier);
  return NextResponse.redirect(url);
}
