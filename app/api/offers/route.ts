import { NextResponse } from "next/server";
import { cacheKey, getCachedValue } from "../../../src/lib/offer-cache";
import { normalizeOffer, sortOffersByFinalPrice } from "../../../src/lib/offers";
import { fetchCrawledOffers } from "../../../src/lib/sources/insane-search";

type OffersPayload = {
  fetchedAt: string;
  offers: ReturnType<typeof normalizeOffer>[];
};

const offerCache = new Map<string, { expiresAt: number; pending?: Promise<OffersPayload>; value?: OffersPayload }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "생두";

  try {
    const payload = await getCachedValue(offerCache, cacheKey(query), async () => {
      const fetchedAt = new Date().toISOString();
      const rawOffers = await fetchCrawledOffers(query, fetchedAt);
      const offers = sortOffersByFinalPrice(rawOffers.map(normalizeOffer).filter((offer) => offer.price > 0));
      return { fetchedAt, offers };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown offer fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
