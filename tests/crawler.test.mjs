import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCrawlQuality,
  canonicalOfferUrl,
  coffeeKey,
  directShopPriceFromLines,
  findCommonCoffeeInfo,
  isDefaultCrawlQuery,
  mergeCoffeeInfo,
  parseOfferFromLines,
  parseDirectShopOffer,
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
