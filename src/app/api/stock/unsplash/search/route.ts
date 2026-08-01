import { searchStockPhotos } from "@/lib/llm/stages/stockPhotoResolver";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limit = Number(searchParams.get("limit") ?? "12");
  const page = Number(searchParams.get("page") ?? "1");
  const orientation = searchParams.get("orientation") as
    | "landscape"
    | "portrait"
    | "squarish"
    | null;
  const color = searchParams.get("color")?.trim() || undefined;
  const orderBy = searchParams.get("orderBy") as "relevant" | "latest" | null;

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json(
      { error: "Unsplash is not configured", results: [] },
      { status: 503 },
    );
  }

  const results = await searchStockPhotos(query, {
    limit,
    page,
    orientation: orientation ?? undefined,
    color,
    orderBy: orderBy ?? undefined,
  });
  return NextResponse.json({ results, page });
}
