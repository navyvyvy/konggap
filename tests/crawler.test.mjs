import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCrawlQuality,
  canonicalOfferUrl,
  coffeeKey,
  dedupeOffers,
  directShopPriceFromLines,
  findCommonCoffeeInfo,
  isDefaultCrawlQuery,
  mergeCoffeeInfo,
  parseOfferFromLines,
  parseDirectShopOffer,
  prioritizeMissingCoffeeInfo,
} from "../scripts/crawl-green-beans.mjs";

test("production crawler keeps coffee grade in metadata keys", () => {
  const g1 = coffeeKey("에티오피아 예가체프 G1 워시드 생두 1kg");
  const g2 = coffeeKey("에티오피아 예가체프 G2 워시드 생두 1kg");

  assert.match(g1, /G1/i);
  assert.match(g2, /G2/i);
  assert.notEqual(g1, g2);
});

test("production crawler recognizes free Naver shipping", () => {
  const offer = parseOfferFromLines([
    "에티오피아 예가체프 생두 1kg",
    "18,000원",
    "배송비",
    "무료",
  ], "https://shopping.naver.com/v2/bridge/searchGate?nv_mid=1");

  assert.equal(offer?.shippingFee, 0);
});

test("production crawler accepts Naver prices split from the won label", () => {
  const offer = parseOfferFromLines([
    "에티오피아 예가체프 원두 1kg",
    "18,000",
    "원",
    "배송비",
    "3,000원",
  ], "https://shopping.naver.com/v2/bridge/searchGate?nv_mid=2", "whole");

  assert.equal(offer?.price, 18_000);
  assert.equal(offer?.shippingFee, 3_000);
});

test("production crawler canonicalizes new GD5 shop links", () => {
  assert.equal(
    canonicalOfferUrl("https://www.1kgcoffee.co.kr/goods/goods_view.php?goodsNo=1000000729&utm_source=test"),
    "https://1kgcoffee.co.kr/goods/goods_view.php?goodsNo=1000000729",
  );
});

test("production crawler does not invent metadata from country alone", () => {
  const info = findCommonCoffeeInfo("에티오피아 이름 미상");

  assert.deepEqual(info.flavorTags, []);
  assert.deepEqual(info.roastTags, []);
  assert.equal(info.tasteNote, "");
});

test("coffee info merge accepts the first partial metadata result", () => {
  const info = { flavorTags: ["워시드"], roastTags: [], tasteNote: "시트러스", rawDescription: "워시드 시트러스" };
  assert.deepEqual(mergeCoffeeInfo("테스트", info, null), info);
});

test("coffee info searches rotate unresolved entries", () => {
  const keys = prioritizeMissingCoffeeInfo({
    recent: { lastSearchAt: "2026-07-30T12:00:00.000Z", flavorTags: [], roastTags: [], tasteNote: "" },
    untried: null,
    older: { lastSearchAt: "2026-07-29T12:00:00.000Z", flavorTags: [], roastTags: [], tasteNote: "" },
    complete: { flavorTags: ["워시드"], roastTags: ["약배전"], tasteNote: "꽃향" },
  });

  assert.deepEqual(keys, ["untried", "older", "recent"]);
});

test("direct shop parser rejects navigation links with nearby prices", () => {
  const offer = parseDirectShopOffer({
    title: "내 취향에 맞는 원두 탐색",
    link: "https://www.1kgcoffee.co.kr/main/html.php?htmid=service/beansintro.htm",
    lines: ["내 취향에 맞는 원두 탐색", "8,000원", "1kg"],
  }, {
    url: "https://m.1kgcoffee.co.kr/goods/goods_list.php?cateCd=001001",
    seller: "1킬로커피",
    needsWeight: true,
  }, "whole");

  assert.equal(offer, null);
});

test("direct shop parser requires a weight and rejects coffee-brand accessories", () => {
  const shop = { url: "https://wondoobj.com/category/coffee/1/", seller: "원두반점" };

  assert.equal(parseDirectShopOffer({
    title: "원두반점 에코 강화 글라스 500ml",
    link: "https://wondoobj.com/product/eco-glass/46/",
    lines: ["원두반점 에코 강화 글라스 500ml", "12,000원"],
  }, shop, "whole"), null);
  assert.equal(parseDirectShopOffer({
    title: "에티오피아 예가체프 원두",
    link: "https://wondoobj.com/product/yirgacheffe/47/",
    lines: ["에티오피아 예가체프 원두", "12,000원"],
  }, shop, "whole"), null);

  const offer = parseDirectShopOffer({
    title: "에티오피아 예가체프 원두",
    link: "https://wondoobj.com/product/yirgacheffe/47/",
    lines: ["에티오피아 예가체프 원두", "100g", "12,000원"],
  }, shop, "whole");
  assert.equal(offer?.title, "에티오피아 예가체프 원두 100g");
});

test("production crawler removes the same Naver item across source routes", () => {
  const offers = dedupeOffers([
    {
      title: "에티오피아 예가체프 생두 1kg",
      link: "https://cr3.shopping.naver.com/v2/bridge/searchGate?nv_mid=11962494180&query=a",
      price: 25000,
      shippingFee: 3000,
      seller: "네이버",
      source: "naver",
    },
    {
      title: "에티오피아 예가체프 생두 1kg",
      link: "https://shopping.naver.com/v2/bridge/searchGate?query=b&nv_mid=11962494180",
      price: 25000,
      shippingFee: 3000,
      seller: "원두상점",
      source: "shop",
    },
  ]);

  assert.equal(offers.length, 1);
});

test("direct shop price parser handles split won labels without reading G1 as one won", () => {
  assert.equal(directShopPriceFromLines(["에티오피아 예가체프 G1 원두", "9,800", "원", "REVIEW : 82"]), 9800);
});

test("default crawl quality gate keeps partial snapshots from replacing production data", () => {
  assert.equal(isDefaultCrawlQuery("생두"), true);
  assert.equal(isDefaultCrawlQuery("예가체프"), false);
  assert.throws(() => assertCrawlQuality("생두", "green", 49), /previous snapshot kept/);
  assert.throws(() => assertCrawlQuality("생두", "green", 170, 300), /previous snapshot kept/);
  assert.doesNotThrow(() => assertCrawlQuality("생두", "green", 180, 300));
  assert.doesNotThrow(() => assertCrawlQuality("예가체프", "green", 1));
});
