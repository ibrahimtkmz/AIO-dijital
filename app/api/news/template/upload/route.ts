import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname !== "news/template.mp4") {
          throw new Error("Geçersiz şablon yolu.");
        }

        return {
          allowedContentTypes: ["video/mp4"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 25 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("news template upload completed", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
