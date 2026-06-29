import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RawOffer, OfferSource } from "../offers";

const execFileAsync = promisify(execFile);

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

export function mapCrawledOffers(items: CrawledOffer[], fetchedAt: string): RawOffer[] {
  return items
    .filter((item) => item.price > 0 && item.link && item.title)
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
        shippingFee: item.shippingFee ?? null,
        flavorTags: item.flavorTags,
        roastTags: item.roastTags,
        tasteNote: item.tasteNote,
        rawDescription: item.rawDescription,
        fetchedAt,
      };
    });
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

export async function fetchCrawledOffers(query: string, fetchedAt = new Date().toISOString()) {
  const greenQuery = toGreenBeanQuery(query);
  const crawlerResult = await runPlaywrightCrawler(greenQuery);
  let offers = crawlerResult.offers ?? [];

  if (!offers.length) {
    const engineResult = await runEngine(greenQuery);
    offers = engineResult.offers ?? [];
  }

  return mapCrawledOffers(offers, fetchedAt);
}
