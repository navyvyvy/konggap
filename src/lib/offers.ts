export type OfferSource = "naver" | "shop";

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
  originTag?: string;
  flavorTag?: string;
  roastTag?: string;
  tasteNote?: string;
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

export function sortOffersByFinalPrice<T extends { finalPrice: number }>(offers: T[], direction: "asc" | "desc" = "asc") {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...offers].sort((left, right) => (left.finalPrice - right.finalPrice) * multiplier);
}

export function filterOffers<T extends { finalPrice: number; flavorTags: string[]; roastTags: string[]; tasteNote: string; name?: string; rawDescription?: string }>(offers: T[], filters: OfferFilters) {
  return offers.filter((offer) =>
    (filters.minPrice === undefined || offer.finalPrice >= filters.minPrice) &&
    (filters.maxPrice === undefined || offer.finalPrice <= filters.maxPrice) &&
    (!filters.originTag || inferOriginTags(`${offer.name ?? ""} ${offer.rawDescription ?? ""}`).includes(filters.originTag)) &&
    (!filters.flavorTag || offer.flavorTags.includes(filters.flavorTag)) &&
    (!filters.roastTag || offer.roastTags.includes(filters.roastTag)) &&
    (!filters.tasteNote || offer.tasteNote.split(",").map((note) => note.trim()).includes(filters.tasteNote)),
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
    if (host === "gsc.coffee" && parsed.searchParams.has("goodsNo")) return `${origin}${parsed.pathname}?goodsNo=${parsed.searchParams.get("goodsNo")}`;
    if (host === "almacielo.com" && parsed.searchParams.has("pno")) return `${origin}${parsed.pathname}?pno=${parsed.searchParams.get("pno")}`;
    if (/(rehmcoffee|momos|coffeesys)\.co\.kr$/.test(host) || /(sopexkorea|coffeecg|kapkawa)\.com$/.test(host)) {
      const productPath = parsed.pathname.match(/^(\/product\/.+?\/\d+)(?:\/|$)/)?.[1];
      if (productPath) return `${origin}${productPath}`;
    }
    return url.trim();
  } catch {
    return url.trim();
  }
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

export function getOriginTags(raw: Pick<RawOffer, "name" | "rawDescription">) {
  return inferOriginTags(`${raw.name} ${raw.rawDescription ?? ""}`);
}

function trustedCoffeeInfoText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/(쿠팡|드립백|캡슐|분쇄|당일\s*로스팅|당일로스팅)/i.test(line))
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
  const tasteText = `${text} ${englishTasteAliases(text)}`;
  const notes = [
    "꽃향", "플로럴", "라벤더", "자스민", "재스민", "베르가못",
    "베리", "라즈베리", "크랜베리", "블루베리", "딸기", "체리",
    "시트러스", "레몬", "오렌지", "천혜향", "청사과", "복숭아",
    "백도", "살구", "자두", "무화과", "포도", "청포도", "애플망고",
    "파인애플", "열대과일", "사탕수수", "조청", "시럽", "메이플시럽",
    "캐러멜", "카라멜", "바닐라", "대추야자", "건자두", "레드와인",
    "초콜릿", "밀크초콜릿", "견과", "아몬드", "헤이즐넛", "피칸",
    "꿀", "와인", "허브", "삼나무", "산미", "단맛", "바디", "실키", "쥬시",
  ].filter((note) => tasteText.includes(note.toLowerCase()));

  return notes.length ? notes.slice(0, 4).join(", ") : "";
}

function inferOriginTags(text: string) {
  const origins: Array<[string, RegExp]> = [
    ["에티오피아", /(에티오피아|ethiopia|yirgacheffe|예가체프|sidamo|시다모|guji|구지|limu|리무)/i],
    ["브라질", /(브라질|brazil|cerrado|세하도|santos|산토스)/i],
    ["콜롬비아", /(콜롬비아|colombia|huila|우일라|narino|나리뇨)/i],
    ["케냐", /(케냐|kenya|kiambu|키암부|nyeri|니에리)/i],
    ["과테말라", /(과테말라|guatemala|antigua|안티구아|huehuetenango|우에우에테낭고)/i],
    ["온두라스", /(온두라스|honduras)/i],
    ["니카라과", /(니카라과|nicaragua)/i],
    ["코스타리카", /(코스타리카|costa\s*rica)/i],
    ["엘살바도르", /(엘살바도르|el\s*salvador)/i],
    ["페루", /(페루|peru)/i],
    ["파나마", /(파나마|panama)/i],
    ["르완다", /(르완다|rwanda)/i],
    ["탄자니아", /(탄자니아|tanzania)/i],
    ["베트남", /(베트남|vietnam|robusta|로부스타)/i],
    ["인도네시아", /(인도네시아|indonesia|만델링|mandheling|sumatra|수마트라)/i],
    ["인도", /(인도|india|monsooned|몬순)/i],
    ["멕시코", /(멕시코|mexico)/i],
    ["볼리비아", /(볼리비아|bolivia)/i],
    ["에콰도르", /(에콰도르|ecuador)/i],
    ["동티모르", /(동티모르|timor)/i],
    ["자메이카", /(자메이카|jamaica|blue\s*mountain|블루마운틴)/i],
  ];

  return origins.filter(([, test]) => test.test(text)).map(([origin]) => origin);
}

function englishTasteAliases(text: string) {
  return [
    /(floral|flower|jasmine)/i.test(text) && "꽃향 자스민",
    /(citrus|bergamot)/i.test(text) && "시트러스 베르가못",
    /lemon/i.test(text) && "레몬",
    /orange/i.test(text) && "오렌지",
    /(berry|berries|raspberry|blueberry)/i.test(text) && "베리",
    /(peach|apricot)/i.test(text) && "복숭아 살구",
    /(grape|wine)/i.test(text) && "포도 와인",
    /(chocolate|chocalate|cacao)/i.test(text) && "초콜릿",
    /(caramel|toffee)/i.test(text) && "캐러멜",
    /(nut|nutty|almond|pecan|hazelnut)/i.test(text) && "견과",
    /honey/i.test(text) && "꿀",
    /(sweet|sweetness|syrup)/i.test(text) && "단맛 시럽",
    /(acidity|acidic)/i.test(text) && "산미",
    /(body|mouthfeel)/i.test(text) && "바디",
    /(earthy|herb)/i.test(text) && "허브",
  ].filter(Boolean).join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
