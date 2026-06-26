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

type StableMetadata = {
  flavorTags: string[];
  roastTags: string[];
  tasteNote: string;
};

const metadataCache = new Map<string, StableMetadata>();

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
    roastTags: unique([...(raw.roastTags ?? []), ...inferred.roastTags]),
    tasteNote: raw.tasteNote ?? inferred.tasteNote,
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

export function buildFlavorCacheKey(name: string) {
  const cleaned = stripHtml(name).toLowerCase();
  const grade = cleaned.match(/\bg[1-5]\b/i)?.[0] ?? "";
  const process = /(내추럴|natural|워시드|washed|허니|honey)/i.exec(cleaned)?.[0] ?? "";
  const withoutWeight = cleaned.replace(/\b\d+(\.\d+)?\s*(g|kg)\b/gi, "").replace(/\s+/g, " ").trim();

  return `${withoutWeight}|${grade}|${process}`;
}

export function getStableMetadata(raw: Pick<RawOffer, "name" | "rawDescription">) {
  const key = buildFlavorCacheKey(raw.name);
  const cached = metadataCache.get(key);
  const nameText = stripHtml(raw.name).toLowerCase();
  const text = stripHtml(`${raw.name} ${raw.rawDescription ?? ""}`).toLowerCase();
  const flavorTags = unique([...(cached?.flavorTags ?? []), ...inferFlavorTags(nameText)]);
  const roastTags = unique([...(cached?.roastTags ?? []), ...inferRoastTags(text)]);
  const tasteNote = cached?.tasteNote || inferTasteNote(text);
  const metadata = { flavorTags, roastTags, tasteNote };

  metadataCache.set(key, metadata);
  return metadata;
}

function inferFlavorTags(text: string) {
  const tags: string[] = [];
  if (/(내추럴|natural)/i.test(text)) tags.push("내추럴");
  if (/(워시드|washed)/i.test(text)) tags.push("워시드");
  if (/(허니|honey)/i.test(text)) tags.push("허니");
  if (/(디카페인|decaf|decaffeinated)/i.test(text)) tags.push("디카페인");
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
    "카라멜", "초콜릿", "견과", "꿀", "와인", "허브", "산미", "바디",
  ].filter((note) => text.includes(note.toLowerCase()));

  return notes.length ? notes.slice(0, 4).join(", ") : "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
