import { searchStockPhotos } from "@/lib/llm/stages/stockPhotoResolver";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limit = Number(searchParams.get("limit") ?? "12");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json(
      { error: "Unsplash is not configured", results: [] },
      { status: 503 },
    );
  }

  const results = await searchStockPhotos(query, limit);
  return NextResponse.json({ results });
}
