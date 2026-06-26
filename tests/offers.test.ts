import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFlavorCacheKey,
  normalizeOffer,
  paginateOffers,
  stripHtml,
} from "../src/lib/offers";
import {
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

test("buildFlavorCacheKey separates grade and process", () => {
  assert.notEqual(
    buildFlavorCacheKey("에티오피아 예가체프 G1 내추럴 생두 2kg"),
    buildFlavorCacheKey("에티오피아 예가체프 G2 워시드 생두 2kg"),
  );
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
});
