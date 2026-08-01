import { triggerUnsplashDownload } from "@/lib/llm/stages/stockPhotoResolver";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json(
      { error: "Unsplash is not configured", ok: false },
      { status: 503 },
    );
  }

  let downloadUrl: string | undefined;
  try {
    const body = (await request.json()) as { downloadUrl?: string };
    downloadUrl = body.downloadUrl?.trim();
  } catch {
    downloadUrl = undefined;
  }

  if (!downloadUrl) {
    return NextResponse.json({ error: "Missing downloadUrl", ok: false }, { status: 400 });
  }

  const ok = await triggerUnsplashDownload(downloadUrl);
  return NextResponse.json({ ok });
}
