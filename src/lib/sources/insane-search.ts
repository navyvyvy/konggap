import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { canonicalOfferUrl, type RawOffer, type OfferSource } from "../offers";

const execFileAsync = promisify(execFile);
const MAX_REASONABLE_PRICE = 1_000_000;
export type ProductKind = "green" | "whole";
const SHOP_SHIPPING_RULES = [
  { test: /coffeelibre\.kr|커피리브레/, fee: 0 },
  { test: /momos\.co\.kr|모모스커피/, fee: 2500, freeOver: 40_000 },
  { test: /coffeecg\.com|커피창고/, fee: 3000, freeOver: 70_000 },
  { test: /coffeeplant\.co\.kr|생두몰/, fee: 4000, freeOver: 50_000 },
  { test: /coffeesys\.co\.kr|커피시스/, fee: 3000, freeOver: 50_000 },
];

export type CrawledOffer = {
  title: string;
  link: string;
  price: number;
  shippingFee?: number | null;
  seller?: string;
  source?: string;
  flavorTags?: string[];
  roastTags?: string[];
  tasteNote?: string;
  rawDescription?: string;
};

type EngineResult = {
  offers?: CrawledOffer[];
  must_invoke_playwright_mcp?: boolean;
};

export function toGreenBeanQuery(query: string) {
  const trimmed = query.trim() || "생두";
  return /생두|green\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 생두`;
}

export function toProductQuery(query: string, productKind: ProductKind = "green") {
  if (productKind === "green") return toGreenBeanQuery(query);
  const trimmed = query.trim() || "원두";
  return /원두|홀빈|whole\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 원두`;
}

export function isBuyableGreenBeanOffer(title: string, source?: string) {
  return isBuyableOffer(title, source, "green");
}

export function isBuyableOffer(title: string, source?: string, productKind: ProductKind = "green") {
  if (isBlockedShoppingTitle(title, productKind) || !/\d+\s*(kg|g)/i.test(title)) return false;
  if (productKind === "green" && /생두|커피생두|green\s*bean/i.test(title)) return true;
  if (productKind === "whole" && /원두|홀빈|whole\s*bean|roasted\s*bean/i.test(title)) return true;
  return source === "shop" && isCoffeeProductName(title);
}

export function mapCrawledOffers(items: CrawledOffer[], fetchedAt: string, productKind: ProductKind = "green"): RawOffer[] {
  const seen = new Set<string>();

  return items
    .filter((item) => item.price > 0 && item.price <= MAX_REASONABLE_PRICE && item.link && item.title && isBuyableOffer(item.title, item.source, productKind))
    .filter((item) => {
      const keys = dedupeKeys(item);
      if (keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    })
    .slice(0, 200)
    .map((item, index) => {
      const source: OfferSource =
        item.source === "coupang" ? "coupang" : item.source === "shop" ? "shop" : "naver";

      return {
        id: `${source}-${index}-${item.link}`,
        name: item.title,
        seller: item.seller ?? item.source ?? "판매처",
        source,
        sourceUrl: item.link,
        price: item.price,
        shippingFee: item.shippingFee ?? inferShopShippingFee(item),
        flavorTags: item.flavorTags,
        roastTags: item.roastTags,
        tasteNote: item.tasteNote,
        rawDescription: item.rawDescription,
        fetchedAt,
      };
    });
}

export function inferShopShippingFee(item: Pick<CrawledOffer, "seller" | "link" | "price">) {
  const target = `${item.seller ?? ""} ${item.link ?? ""}`;
  const rule = SHOP_SHIPPING_RULES.find((candidate) => candidate.test.test(target));
  if (!rule) return null;
  return rule.freeOver && item.price >= rule.freeOver ? 0 : rule.fee;
}

function dedupeKeys(item: CrawledOffer) {
  const linkKey = canonicalOfferUrl(item.link);
  const title = item.title.replace(/\s+/g, " ").trim().toLowerCase();
  if (item.source !== "naver") return [`link:${linkKey}`, `shop:item:${item.seller}:${title}:${item.price}:${item.shippingFee ?? ""}`];
  const itemKey = `naver:item:${title}:${item.price}:${item.shippingFee ?? ""}`;
  return linkKey.startsWith("naver:nv_mid:") ? [linkKey, itemKey] : [itemKey];
}

function isBlockedShoppingTitle(title: string, productKind: ProductKind) {
  if (/([2-9]\d*\s*개|세트|묶음|박스|box|set|드립백|캡슐|콜드브루|더치|분쇄|그라인더|필터|드리퍼|서버|샘플|sample)/i.test(title)) return true;
  if (productKind === "green") return /(원두|홀빈|볶은|볶음|로스팅\s*(망|기|서비스|홀빈)|당일\s*로스팅|당일로스팅)/i.test(title);
  return /(생두|커피생두|green\s*bean|로스팅\s*(망|기|서비스))/i.test(title);
}

function isCoffeeProductName(title: string) {
  return /(브라질|콜롬비아|에티오피아|케냐|과테말라|니카라과|온두라스|페루|동티모르|자메이카|인도|코스타리카|엘살바도르|멕시코|볼리비아|에콰도르|르완다|만델링|로부스타|아라비카|수프리모|예가체프|시다모|안티구아|세하도|워시드|내추럴|Brazil|Colombia|Ethiopia|Kenya|Guatemala|Nicaragua|Honduras|Peru|Costa Rica|Bolivia|Ecuador|Rwanda|Washed|Natural|Honey)/i.test(title);
}

async function runEngine(query: string) {
  const skillDir =
    process.env.INSANE_SEARCH_DIR ??
    "C:\\Users\\zdiso\\.codex\\plugins\\cache\\gptaku-codex\\insane-search-codex\\0.8.2\\skills\\insane-search";
  const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`;
  const args = ["-m", "engine", searchUrl, "--trace", "--json", "--timeout", "20", "--max-attempts", "8"];

  const result = await execFileAsync("python", args, {
    cwd: skillDir,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  }).catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "{}" }));

  return JSON.parse(result.stdout || "{}") as EngineResult;
}

async function runPlaywrightCrawler(query: string) {
  const result = await execFileAsync("node", ["scripts/crawl-green-beans.mjs", query], {
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(result.stdout || "{}") as { offers?: CrawledOffer[] };
}

export async function fetchCrawledOffers(query: string, fetchedAt = new Date().toISOString(), productKind: ProductKind = "green") {
  const productQuery = toProductQuery(query, productKind);
  const crawlerResult = await runPlaywrightCrawler(productQuery);
  let offers = crawlerResult.offers ?? [];

  if (!offers.length) {
    const engineResult = await runEngine(productQuery);
    offers = engineResult.offers ?? [];
  }

  return mapCrawledOffers(offers, fetchedAt, productKind);
}
