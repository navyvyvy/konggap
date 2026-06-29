import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFlavorCacheKey,
  getStableMetadata,
  normalizeOffer,
  paginateOffers,
  sortOffersByFinalPrice,
  stripHtml,
  toggleFavoriteOffer,
} from "../src/lib/offers";
import {
  isBuyableGreenBeanOffer,
  mapCrawledOffers,
  toGreenBeanQuery,
} from "../src/lib/sources/insane-search";

test("stripHtml removes markup and collapses whitespace", () => {
  assert.equal(stripHtml("<b>예가체프</b>   생두 2kg"), "예가체프 생두 2kg");
});

test("normalizeOffer calculates final price with known shipping", () => {
  const offer = normalizeOffer({
    id: "n-1",
    name: "<b>예가체프</b> 생두 2kg",
    seller: "테스트몰",
    source: "naver",
    sourceUrl: "https://example.com",
    price: 25000,
    shippingFee: 3000,
    fetchedAt: "2026-06-26T12:00:00.000Z",
  });

  assert.equal(offer.name, "예가체프 생두 2kg");
  assert.equal(offer.finalPrice, 28000);
  assert.equal(offer.shippingKnown, true);
});

test("normalizeOffer treats unknown shipping as zero but marks it unknown", () => {
  const offer = normalizeOffer({
    id: "n-2",
    name: "브라질 생두 1kg",
    seller: "테스트몰",
    source: "naver",
    sourceUrl: "https://example.com",
    price: 19000,
    shippingFee: null,
    fetchedAt: "2026-06-26T12:00:00.000Z",
  });

  assert.equal(offer.finalPrice, 19000);
  assert.equal(offer.shippingKnown, false);
});

test("paginateOffers returns the requested slice", () => {
  const offers = Array.from({ length: 30 }, (_, index) => ({ id: String(index) }));

  assert.deepEqual(
    paginateOffers(offers, 0, 25).map((offer) => offer.id),
    Array.from({ length: 25 }, (_, index) => String(index)),
  );
  assert.deepEqual(
    paginateOffers(offers, 25, 25).map((offer) => offer.id),
    ["25", "26", "27", "28", "29"],
  );
});

test("sortOffersByFinalPrice sorts by final payment amount", () => {
  const offers = [
    { id: "expensive", finalPrice: 28000 },
    { id: "cheap", finalPrice: 12200 },
    { id: "middle", finalPrice: 19500 },
  ];

  assert.deepEqual(
    sortOffersByFinalPrice(offers).map((offer) => offer.id),
    ["cheap", "middle", "expensive"],
  );
  assert.deepEqual(
    sortOffersByFinalPrice(offers, "desc").map((offer) => offer.id),
    ["expensive", "middle", "cheap"],
  );
});

test("toggleFavoriteOffer toggles by sourceUrl", () => {
  const first = { id: "a", sourceUrl: "https://example.com/a" };
  const duplicateLink = { id: "b", sourceUrl: "https://example.com/a" };

  assert.deepEqual(toggleFavoriteOffer([], first), [first]);
  assert.deepEqual(toggleFavoriteOffer([first], duplicateLink), []);
});

test("buildFlavorCacheKey separates grade and process", () => {
  assert.notEqual(
    buildFlavorCacheKey("에티오피아 예가체프 G1 내추럴 생두 2kg"),
    buildFlavorCacheKey("에티오피아 예가체프 G2 워시드 생두 2kg"),
  );
});

test("buildFlavorCacheKey ignores listing noise", () => {
  assert.equal(
    buildFlavorCacheKey("[New Crop / 생두] 에티오피아 예가체프 아리차 G1 워시드 2025/2026 1kg, 1개 판매가 19,600원"),
    buildFlavorCacheKey("에티오피아 예가체프 아리차 G1 워시드 생두 500g"),
  );
});

test("getStableMetadata extracts process, roast, and taste text when present", () => {
  const metadata = getStableMetadata({
    name: "에티오피아 예가체프 G1 내추럴 생두 1kg",
    rawDescription: "약배전 추천. 꽃향, 시트러스, 꿀 같은 산미가 있습니다.",
  });

  assert.deepEqual(metadata.flavorTags, ["내추럴"]);
  assert.deepEqual(metadata.roastTags, ["약배전"]);
  assert.equal(metadata.tasteNote, "꽃향, 시트러스, 꿀, 산미");
});

test("normalizeOffer merges explicit tags with stable metadata", () => {
  const offer = normalizeOffer({
    id: "n-3",
    name: "콜롬비아 디카페인 생두 1kg",
    seller: "테스트몰",
    source: "naver",
    sourceUrl: "https://example.com",
    price: 21100,
    shippingFee: 3000,
    flavorTags: ["슈가케인"],
    fetchedAt: "2026-06-26T12:00:00.000Z",
  });

  assert.deepEqual(offer.flavorTags, ["슈가케인", "디카페인"]);
});

test("getStableMetadata enriches cached entries when later descriptions exist", () => {
  const base = getStableMetadata({ name: "브라질 세하도 내추럴 생두 1kg" });
  const enriched = getStableMetadata({
    name: "브라질 세하도 내추럴 생두 1kg",
    rawDescription: "중배전에서 초콜릿, 견과 향미가 좋습니다.",
  });

  assert.deepEqual(base.flavorTags, ["내추럴"]);
  assert.deepEqual(enriched.roastTags, ["중배전"]);
  assert.equal(enriched.tasteNote, "초콜릿, 견과");
});

test("getStableMetadata extracts common cup notes and process tags", () => {
  const metadata = getStableMetadata({
    name: "과테말라 우에우에테낭고 SHB 디카페인 MWP 무산소 생두 1kg",
    rawDescription: "컵노트 : 자스민, 복숭아, 포도, 사탕수수, 바닐라",
  });

  assert.deepEqual(metadata.flavorTags, ["디카페인", "MWP", "무산소"]);
  assert.equal(metadata.tasteNote, "자스민, 복숭아, 포도, 사탕수수");
});

test("toGreenBeanQuery appends green bean intent when missing", () => {
  assert.equal(toGreenBeanQuery("예가체프"), "예가체프 생두");
  assert.equal(toGreenBeanQuery("커피 생두"), "커피 생두");
});

test("mapCrawledOffers keeps only priced crawled offers", () => {
  const offers = mapCrawledOffers(
    [
      {
        title: "에티오피아 예가체프 생두 2kg",
        link: "https://example.com/a",
        price: 25000,
        shippingFee: 3000,
        seller: "테스트몰",
        source: "naver",
        flavorTags: ["워시드"],
        rawDescription: "약배전에서 꽃향이 좋습니다.",
      },
      {
        title: "가격 없는 글",
        link: "https://example.com/b",
        price: 0,
      },
    ],
    "2026-06-26T12:00:00.000Z",
  );

  assert.equal(offers.length, 1);
  assert.equal(offers[0]?.source, "naver");
  assert.equal(offers[0]?.shippingFee, 3000);
  assert.equal(offers[0]?.name, "에티오피아 예가체프 생두 2kg");
  assert.deepEqual(offers[0]?.flavorTags, ["워시드"]);
  assert.equal(offers[0]?.rawDescription, "약배전에서 꽃향이 좋습니다.");
});

test("mapCrawledOffers filters non green-bean shopping results", () => {
  const offers = mapCrawledOffers(
    [
      { title: "에티오피아 예가체프 생두 2kg", link: "https://example.com/a", price: 25000 },
      { title: "에티오피아 예가체프 원두 1kg", link: "https://example.com/b", price: 33000 },
      { title: "콜드브루 드립백 세트 10개", link: "https://example.com/c", price: 12000 },
      { title: "커피 로스팅 망", link: "https://example.com/d", price: 9000 },
      { title: "브라질 세하도 생두 1kg 3개", link: "https://example.com/e", price: 49000 },
    ],
    "2026-06-26T12:00:00.000Z",
  );

  assert.deepEqual(offers.map((offer) => offer.name), ["에티오피아 예가체프 생두 2kg"]);
  assert.equal(isBuyableGreenBeanOffer("브라질 세하도 생두 1kg"), true);
  assert.equal(isBuyableGreenBeanOffer("브라질 세하도 생두 1kg 3개"), false);
});
