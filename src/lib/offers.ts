export type OfferSource = "naver" | "coupang" | "shop";

export type RawOffer = {
  id: string;
  name: string;
  seller: string;
  source: OfferSource;
  sourceUrl: string;
  price: number;
  shippingFee: number | null;
  flavorTags?: string[];
  roastTags?: string[];
  tasteNote?: string;
  rawDescription?: string;
  fetchedAt: string;
};

export type Offer = Omit<RawOffer, "flavorTags" | "roastTags" | "tasteNote"> & {
  flavorTags: string[];
  roastTags: string[];
  tasteNote: string;
  finalPrice: number;
  shippingKnown: boolean;
};

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeOffer(raw: RawOffer): Offer {
  const shippingFee = raw.shippingFee ?? 0;

  return {
    ...raw,
    name: stripHtml(raw.name),
    flavorTags: raw.flavorTags ?? [],
    roastTags: raw.roastTags ?? [],
    tasteNote: raw.tasteNote ?? "",
    finalPrice: raw.price + shippingFee,
    shippingKnown: raw.shippingFee !== null,
  };
}

export function paginateOffers<T>(offers: T[], offset: number, pageSize: number) {
  return offers.slice(offset, offset + pageSize);
}

export function buildFlavorCacheKey(name: string) {
  const cleaned = stripHtml(name).toLowerCase();
  const grade = cleaned.match(/\bg[1-5]\b/i)?.[0] ?? "";
  const process = /(내추럴|natural|워시드|washed|허니|honey)/i.exec(cleaned)?.[0] ?? "";
  const withoutWeight = cleaned.replace(/\b\d+(\.\d+)?\s*(g|kg)\b/gi, "").replace(/\s+/g, " ").trim();

  return `${withoutWeight}|${grade}|${process}`;
}
