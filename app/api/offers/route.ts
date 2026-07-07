import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { cacheKey, getCachedValue } from "../../../src/lib/offer-cache";
import { payloadFromSnapshot } from "../../../src/lib/offer-snapshot";
import { normalizeOffer, sortOffersByFinalPrice } from "../../../src/lib/offers";
import { fetchCrawledOffers, type ProductKind } from "../../../src/lib/sources/insane-search";

type OffersPayload = {
  fetchedAt: string;
  offers: ReturnType<typeof normalizeOffer>[];
};

const offerCache = new Map<string, { expiresAt: number; pending?: Promise<OffersPayload>; value?: OffersPayload }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productKind: ProductKind = searchParams.get("product") === "whole" ? "whole" : "green";
  const query = searchParams.get("q")?.trim() || (productKind === "whole" ? "원두" : "생두");
  const refresh = searchParams.get("refresh") === "1";

  try {
    const payload = await getCachedValue(offerCache, cacheKey(`${productKind}:${query}`), async () => {
      if (!refresh) {
        const snapshot = await readLatestSnapshot(query, productKind);
        if (snapshot) return snapshot;
      }

      const fetchedAt = new Date().toISOString();
      const rawOffers = await fetchCrawledOffers(query, fetchedAt, productKind);
      const offers = sortOffersByFinalPrice(rawOffers.map(normalizeOffer).filter((offer) => offer.price > 0));
      return { fetchedAt, offers };
    }, Date.now(), undefined, refresh);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown offer fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function readLatestSnapshot(query: string, productKind: ProductKind) {
  const fileName = productKind === "whole" ? "data/latest-offers-whole.json" : "data/latest-offers.json";
  return readFile(fileName, "utf8")
    .then((text) => payloadFromSnapshot(JSON.parse(text), query, Date.now(), productKind))
    .catch(() => null);
}
