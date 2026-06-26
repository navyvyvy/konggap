import { NextResponse } from "next/server";
import { normalizeOffer } from "../../../src/lib/offers";
import { fetchCrawledOffers } from "../../../src/lib/sources/insane-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "생두";
  const fetchedAt = new Date().toISOString();

  try {
    const rawOffers = await fetchCrawledOffers(query, fetchedAt);
    const offers = rawOffers.map(normalizeOffer).filter((offer) => offer.price > 0);
    return NextResponse.json({ fetchedAt, offers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown offer fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
