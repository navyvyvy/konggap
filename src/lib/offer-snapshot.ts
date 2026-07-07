import { OFFER_CACHE_TTL_MS, cacheKey } from "./offer-cache";
import { normalizeOffer, sortOffersByFinalPrice } from "./offers";
import { mapCrawledOffers, type CrawledOffer, type ProductKind } from "./sources/insane-search";

type OfferSnapshot = {
  fetchedAt: string;
  query: string;
  offers: CrawledOffer[];
};

export function payloadFromSnapshot(snapshot: OfferSnapshot, query: string, now = Date.now(), productKind: ProductKind = "green") {
  const fetchedAtMs = Date.parse(snapshot.fetchedAt);
  if (cacheKey(snapshot.query) !== cacheKey(query) || Number.isNaN(fetchedAtMs) || now - fetchedAtMs > OFFER_CACHE_TTL_MS) return null;

  const offers = sortOffersByFinalPrice(mapCrawledOffers(snapshot.offers, snapshot.fetchedAt, productKind).map(normalizeOffer));
  return { fetchedAt: snapshot.fetchedAt, offers };
}
