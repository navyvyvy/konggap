import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { canonicalOfferUrl, isBuyableOffer, type ProductKind, type RawOffer, type OfferSource } from "../offers";

const execFileAsync = promisify(execFile);
const MAX_REASONABLE_PRICE = 1_000_000;
export { isBuyableOffer };
export type { ProductKind };
const SHOP_SHIPPING_RULES = [
  { test: /coffeelibre\.kr|커피리브레/, fee: 0 },
  { test: /momos\.co\.kr|모모스커피/, fee: 2500, freeOver: 40_000 },
  { test: /coffeecg\.com|커피창고/, fee: 3000, freeOver: 70_000 },
  { test: /coffeeplant\.co\.kr|생두몰/, fee: 4000, freeOver: 50_000 },
  { test: /coffeesys\.co\.kr|커피시스/, fee: 3000, freeOver: 50_000 },
  { test: /gustocoffee\.co\.kr|구스토커피/, fee: 3000 },
  { test: /clubespresso\.co\.kr|클럽에스프레소/, fee: 3000, freeOver: 50_000 },
  { test: /wbeans\.com|더블유빈/, fee: 3500, freeOver: 150_000 },
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

export function toGreenBeanQuery(query: string) {
  const trimmed = query.trim() || "생두";
  return /생두|green\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 생두`;
}

export function toProductQuery(query: string, productKind: ProductKind = "green") {
  if (productKind === "green") return toGreenBeanQuery(query);
  const trimmed = query.trim() || "원두";
  return /원두|홀빈|whole\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 원두`;
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
    .slice(0, 400)
    .map((item, index) => {
      const source: OfferSource =
        item.source === "shop" ? "shop" : "naver";

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
  const canonicalLinkKey = `link:${linkKey}`;
  const title = item.title.replace(/\s+/g, " ").trim().toLowerCase();
  if (item.source !== "naver") return [canonicalLinkKey, `shop:item:${item.seller}:${title}:${item.price}:${item.shippingFee ?? ""}`];
  const itemKey = `naver:item:${title}:${item.price}:${item.shippingFee ?? ""}`;
  return linkKey.startsWith("naver:nv_mid:") ? [canonicalLinkKey, itemKey] : [itemKey];
}

function parseResult(stdout: string) {
  try {
    return JSON.parse(stdout || "{}") as { offers?: CrawledOffer[] };
  } catch {
    return {};
  }
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

  return parseResult(result.stdout);
}

async function runPlaywrightCrawler(query: string) {
  const result = await execFileAsync("node", ["scripts/crawl-green-beans.mjs", query], {
    timeout: 360_000,
    maxBuffer: 10 * 1024 * 1024,
  }).catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "{}" }));
  return parseResult(result.stdout);
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
