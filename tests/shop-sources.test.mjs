import test from "node:test";
import assert from "node:assert/strict";
import { canonicalSourceUrl, mergeDiscoveredSources, restoreDiscoveredSources, sourceCandidate } from "../scripts/discover-shop-sources.mjs";
import { searchQueriesForSources } from "../scripts/crawl-green-beans.mjs";

test("shop source discovery keeps a smartstore at store scope", () => {
  assert.equal(
    canonicalSourceUrl("https://smartstore.naver.com/new_roaster/products/123?foo=bar"),
    "https://smartstore.naver.com/new_roaster",
  );
});

test("shop source discovery rejects portal links", () => {
  assert.equal(sourceCandidate("https://naver.com/coffee", "커피 원두", "whole"), null);
});

test("shop source discovery merges product kinds without replacing manual entries", () => {
  const now = "2026-07-13T00:00:00.000Z";
  const candidate = sourceCandidate("https://www.example.com/products/123", "새 로스터 커피 원두", "whole", now);
  const registry = mergeDiscoveredSources({
    sources: [{ id: "manual", url: "https://example.com/", seller: "기존몰", kinds: ["green"], origin: "manual" }],
  }, [candidate, { ...candidate, kinds: ["green"] }], now);

  assert.equal(registry.sources.length, 1);
  assert.equal(registry.sources[0].seller, "기존몰");
  assert.deepEqual(registry.sources[0].kinds.sort(), ["green", "whole"]);
});

test("shop source restore keeps new manual sources and deployed discoveries", () => {
  const restored = restoreDiscoveredSources({
    sources: [{ id: "manual", url: "https://example.com/", seller: "새 판매처", kinds: ["green"], origin: "manual" }],
  }, {
    lastDiscoveryAt: "2026-07-13T00:00:00.000Z",
    sources: [
      { id: "old-manual", url: "https://old.example.com/", seller: "옛 판매처", kinds: ["whole"], origin: "manual" },
      { id: "discovered", url: "https://found.example.com/", seller: "자동 발견", kinds: ["whole"], origin: "discovered", lastSeenAt: "2026-07-12T00:00:00.000Z" },
    ],
  });

  assert.deepEqual(restored.sources.map((source) => source.seller), ["새 판매처", "자동 발견"]);
  assert.equal(restored.lastDiscoveryAt, "2026-07-13T00:00:00.000Z");
});

test("source registry generates site searches for the selected product kind", () => {
  const queries = searchQueriesForSources([
    { url: "https://smartstore.naver.com/new_roaster", seller: "새 로스터", kinds: ["whole"], direct: true },
    { url: "https://example.com/", seller: "생두몰", kinds: ["green"], direct: true },
  ], "whole");

  assert.deepEqual(queries, ["site:smartstore.naver.com/new_roaster 원두", "site:smartstore.naver.com/new_roaster 홀빈 1kg"]);
});

test("source registry does not drop manual stores behind discovered stores", () => {
  const discovered = Array.from({ length: 48 }, (_, index) => ({
    url: `https://found-${index}.example.com/`, seller: `자동 ${index}`, kinds: ["whole"], direct: true, origin: "discovered",
  }));
  const queries = searchQueriesForSources([
    ...discovered,
    { url: "https://manual.example.com/", seller: "수동 판매처", kinds: ["whole"], direct: false, origin: "manual" },
  ], "whole");

  assert.ok(queries.includes("site:manual.example.com 원두"));
});
