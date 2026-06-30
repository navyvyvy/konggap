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

export type OfferFilters = {
  minPrice?: number;
  maxPrice?: number;
  flavorTag?: string;
  roastTag?: string;
};

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeOffer(raw: RawOffer): Offer {
  const shippingFee = raw.shippingFee ?? 0;
  const inferred = getStableMetadata(raw);

  return {
    ...raw,
    name: stripHtml(raw.name),
    flavorTags: unique([...(raw.flavorTags ?? []), ...inferred.flavorTags]),
    roastTags: inferred.roastTags,
    tasteNote: inferred.tasteNote,
    finalPrice: raw.price + shippingFee,
    shippingKnown: raw.shippingFee !== null,
  };
}

export function paginateOffers<T>(offers: T[], offset: number, pageSize: number) {
  return offers.slice(offset, offset + pageSize);
}

export function sortOffersByFinalPrice<T extends { finalPrice: number }>(offers: T[], direction: "asc" | "desc" = "asc") {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...offers].sort((left, right) => (left.finalPrice - right.finalPrice) * multiplier);
}

export function filterOffers<T extends { finalPrice: number; flavorTags: string[]; roastTags: string[] }>(offers: T[], filters: OfferFilters) {
  return offers.filter((offer) =>
    (filters.minPrice === undefined || offer.finalPrice >= filters.minPrice) &&
    (filters.maxPrice === undefined || offer.finalPrice <= filters.maxPrice) &&
    (!filters.flavorTag || offer.flavorTags.includes(filters.flavorTag)) &&
    (!filters.roastTag || offer.roastTags.includes(filters.roastTag)),
  );
}

export function toggleFavoriteOffer<T extends { sourceUrl: string }>(favorites: T[], offer: T) {
  const target = canonicalOfferUrl(offer.sourceUrl);
  return favorites.some((favorite) => canonicalOfferUrl(favorite.sourceUrl) === target)
    ? favorites.filter((favorite) => canonicalOfferUrl(favorite.sourceUrl) !== target)
    : [offer, ...favorites];
}

export function canonicalOfferUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(m|www)\./, "");
    const origin = `${parsed.protocol}//${host}`;
    if (host === "smartstore.naver.com" && parsed.pathname.includes("/products/")) return `${origin}${parsed.pathname}`;
    if (host.endsWith("shopping.naver.com") && parsed.searchParams.has("nv_mid")) return `naver:nv_mid:${parsed.searchParams.get("nv_mid")}`;
    if (host === "coffeeplant.co.kr" && parsed.searchParams.has("idx")) return `${origin}/?idx=${parsed.searchParams.get("idx")}`;
    if ((host === "coffeelibre.kr" || host === "coffeecg.com") && parsed.searchParams.has("product_no")) return `${origin}${parsed.pathname}?product_no=${parsed.searchParams.get("product_no")}`;
    if (host === "almacielo.com" && parsed.searchParams.has("pno")) return `${origin}${parsed.pathname}?pno=${parsed.searchParams.get("pno")}`;
    if (/(rehmcoffee|momos|coffeesys)\.co\.kr$/.test(host) || /(sopexkorea|coffeecg)\.com$/.test(host)) {
      const productPath = parsed.pathname.match(/^(\/product\/.+?\/\d+)(?:\/|$)/)?.[1];
      if (productPath) return `${origin}${productPath}`;
    }
    return url.trim();
  } catch {
    return url.trim();
  }
}

export function buildFlavorCacheKey(name: string) {
  const cleaned = stripHtml(name).toLowerCase();
  const grade = cleaned.match(/\bg[1-5]\b/i)?.[0] ?? "";
  const process = /(내추럴|natural|워시드|washed|허니|honey|디카페인|decaf|mwp|슈가케인|sugarcane|무산소|anaerobic)/i.exec(cleaned)?.[0] ?? "";
  const withoutWeight = cleaned
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\bnew\s*crop\b|커피생두|생두|뉴크롭|프리미엄|할인|판매가|외\s*\d+종/gi, " ")
    .replace(/\d+\s*개/g, " ")
    .replace(/\b\d{4}\s*\/\s*\d{4}\b|\b\d{4}\b/g, " ")
    .replace(/\d[\d,]*원/g, " ")
    .replace(/\b\d+(\.\d+)?\s*(g|kg)\b/gi, " ")
    .replace(/[,，]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${withoutWeight}|${grade}|${process}`;
}

export function getStableMetadata(raw: Pick<RawOffer, "name" | "rawDescription">) {
  const nameText = stripHtml(raw.name).toLowerCase();
  const trustedDescription = trustedCoffeeInfoText(raw.rawDescription ?? "");
  const text = stripHtml(`${raw.name} ${trustedDescription}`).toLowerCase();
  return {
    flavorTags: inferFlavorTags(nameText),
    roastTags: inferRoastTags(text),
    tasteNote: inferTasteNote(text),
  };
}

function trustedCoffeeInfoText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/(쿠팡|원두|홀빈|드립백|캡슐|분쇄|당일\s*로스팅|당일로스팅|로스팅홀빈)/i.test(line))
    .join(" ");
}

function inferFlavorTags(text: string) {
  const tags: string[] = [];
  if (/(내추럴|natural)/i.test(text)) tags.push("내추럴");
  if (/(워시드|washed)/i.test(text)) tags.push("워시드");
  if (/(허니|honey)/i.test(text)) tags.push("허니");
  if (/(디카페인|decaf|decaffeinated)/i.test(text)) tags.push("디카페인");
  if (/\bmwp\b/i.test(text)) tags.push("MWP");
  if (/(슈가케인|sugar\s*cane|sugarcane)/i.test(text)) tags.push("슈가케인");
  if (/(무산소|anaerobic)/i.test(text)) tags.push("무산소");
  return tags;
}

function inferRoastTags(text: string) {
  const tags: string[] = [];
  if (/(약배전|라이트\s*로스트|light\s*roast)/i.test(text)) tags.push("약배전");
  if (/(중배전|미디엄\s*로스트|medium\s*roast)/i.test(text)) tags.push("중배전");
  if (/(강배전|다크\s*로스트|dark\s*roast)/i.test(text)) tags.push("강배전");
  return tags.length > 2 ? [] : tags;
}

function inferTasteNote(text: string) {
  const notes = [
    "꽃향", "플로럴", "베리", "블루베리", "시트러스", "레몬", "청사과",
    "자스민", "복숭아", "포도", "사탕수수", "캐러멜", "카라멜", "바닐라",
    "딸기", "체리", "오렌지", "대추야자", "건자두", "레드와인",
    "초콜릿", "견과", "꿀", "와인", "허브", "산미", "바디",
  ].filter((note) => text.includes(note.toLowerCase()));

  return notes.length ? notes.slice(0, 4).join(", ") : "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
