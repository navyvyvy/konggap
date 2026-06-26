import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const MAX_OFFERS = 100;
const DATA_DIR = "data";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function greenBeanQuery(query) {
  const trimmed = query.trim() || "생두";
  return /생두|green\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 생두`;
}

function queryVariants(query) {
  return [...new Set([query, `${query} 1kg`, query.includes("커피") ? query : `커피${query}`])];
}

function moneyLineToNumber(line) {
  const match = line.trim().match(/^(\d[\d,]*)원$/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function cleanTitle(line) {
  return line.replace(/^구매\s*[\d,.]+\+?\s*/, "").trim();
}

function isProductTitle(line) {
  return /생두|커피생두/.test(line) && /\d+\s*(kg|g)/i.test(line);
}

function parseOfferFromLines(lines, link, query) {
  for (let index = 0; index < lines.length; index += 1) {
    const title = cleanTitle(lines[index]);
    if (!isProductTitle(title)) continue;

    const next = lines.slice(index + 1, index + 12);
    const shippingIndex = next.findIndex((line) => line === "배송비");
    const priceScope = shippingIndex >= 0 ? next.slice(0, shippingIndex) : next;
    const price = priceScope.map(moneyLineToNumber).filter(Boolean).at(-1) ?? 0;
    const shippingFee = shippingIndex >= 0 ? moneyLineToNumber(next[shippingIndex + 1] ?? "") || null : null;

    if (price > 0) {
      return { title, link, price, shippingFee, seller: "네이버", source: "naver" };
    }
  }

  return null;
}

async function crawlNaver(page, query) {
  const offers = [];

  for (const variant of queryVariants(query)) {
    await page.goto(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(variant)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(1500);

    const pageLimit = variant === query ? 3 : 1;
    for (let pageIndex = 0; pageIndex < pageLimit && offers.length < MAX_OFFERS; pageIndex += 1) {
      offers.push(...(await collectNaverPageOffers(page, variant)));
      const next = page.getByText("다음 페이지").first();
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click().catch(() => null);
      await page.waitForTimeout(800);
    }
  }

  return dedupeOffers(offers);
}

async function collectNaverPageOffers(page, query) {
  const items = await page.evaluate(() => [...document.querySelectorAll("li")]
    .map((item) => {
      const lines = item.innerText.split("\n").map((line) => line.trim()).filter(Boolean);
      const titles = lines.filter((line) => /생두|커피생두/.test(line) && /\d+\s*(kg|g)/i.test(line));
      const link = [...item.querySelectorAll("a[href]")]
        .map((anchor) => anchor.href)
        .find((href) => /ader\.naver\.com|shopping\.naver\.com\/v2\/bridge/.test(href));
      return { lines, link, titleCount: titles.length };
    })
    .filter((item) => item.link && item.titleCount === 1 && item.lines.some((line) => /원$/.test(line))));

  return items.map((item) => parseOfferFromLines(item.lines, item.link, query)).filter(Boolean);
}

async function crawlCoupang(page, query) {
  try {
    await page.goto(`https://m.coupang.com/nm/search?q=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await page.waitForTimeout(2500);

    const denied = /Access Denied|permission to access/i.test(await page.locator("body").innerText());
    if (denied) return { offers: [], error: "Access Denied" };

    const offers = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((anchor) => {
      const text = anchor.innerText || anchor.textContent || "";
      const price = Number((text.match(/(\d[\d,]*)원/)?.[1] ?? "0").replace(/,/g, ""));
      return {
        title: text.split("\n").find((line) => /생두|커피생두/.test(line)) ?? "",
        link: anchor.href,
        price,
        shippingFee: /무료배송/.test(text) ? 0 : null,
        seller: "쿠팡",
        source: "coupang",
      };
    }).filter((item) => item.title && item.price > 0));

    return { offers: dedupeOffers(offers), error: "" };
  } catch (error) {
    return { offers: [], error: error instanceof Error ? error.message : "Coupang crawl failed" };
  }
}

async function enrichCoffeeInfo(page, offers) {
  const info = {};
  const keys = [...new Set(offers.map((offer) => coffeeKey(offer.title)).filter(Boolean))].slice(0, 8);

  for (const key of keys) {
    await page.goto(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(`${key} 향미 배전 생두`)}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    }).catch(() => null);
    await page.waitForTimeout(600);

    const rawDescription = await page.locator("body").innerText().then((text) => focusDescription(key, text)).catch(() => "");
    info[key] = { key, rawDescription, ...inferMetadata(`${key} ${rawDescription}`) };
  }

  return info;
}

function applyCoffeeInfo(offers, info) {
  return offers.map((offer) => {
    const metadata = info[coffeeKey(offer.title)];
    return metadata ? {
      ...offer,
      flavorTags: inferMetadata(offer.title).flavorTags,
      roastTags: metadata.roastTags,
      tasteNote: metadata.tasteNote,
      rawDescription: metadata.rawDescription,
    } : offer;
  });
}

function coffeeKey(title) {
  return title
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\b\d+(\.\d+)?\s*(kg|g)\b/gi, " ")
    .replace(/\b\d+\s*개\b/g, " ")
    .replace(/커피생두|생두|뉴크롭|프리미엄|할인|판매가|외\s*\d+종/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function focusDescription(key, text) {
  const tokens = key.split(/\s+/).filter((token) => token.length > 1).slice(0, 4);
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      tokens.some((token) => line.includes(token)) ||
      /향미|산미|단맛|바디|배전|로스팅|가공|내추럴|워시드|허니|프로세스/.test(line),
    )
    .slice(0, 40)
    .join("\n")
    .slice(0, 2500);
}

function inferMetadata(text) {
  const lower = text.toLowerCase();
  const flavorTags = [
    /(내추럴|natural)/i.test(text) && "내추럴",
    /(워시드|washed)/i.test(text) && "워시드",
    /(허니|honey)/i.test(text) && "허니",
    /(디카페인|decaf|decaffeinated)/i.test(text) && "디카페인",
  ].filter(Boolean);
  const roastTags = [
    /(약배전|라이트\s*로스트|light\s*roast)/i.test(text) && "약배전",
    /(중배전|미디엄\s*로스트|medium\s*roast)/i.test(text) && "중배전",
    /(강배전|다크\s*로스트|dark\s*roast)/i.test(text) && "강배전",
  ].filter(Boolean);
  const tasteNote = ["꽃향", "플로럴", "베리", "블루베리", "시트러스", "레몬", "청사과", "카라멜", "초콜릿", "견과", "꿀", "와인", "허브", "산미", "바디"]
    .filter((note) => lower.includes(note.toLowerCase()))
    .slice(0, 4)
    .join(", ");

  const uniqueRoastTags = [...new Set(roastTags)];
  return { flavorTags: [...new Set(flavorTags)], roastTags: uniqueRoastTags.length > 2 ? [] : uniqueRoastTags, tasteNote };
}

function dedupeOffers(offers) {
  const seen = new Set();
  return offers.filter((offer) => {
    const key = `${offer.source}:${offer.title}:${offer.price}:${offer.shippingFee ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_OFFERS);
}

async function saveJson(name, data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(`${DATA_DIR}/${name}`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const query = greenBeanQuery(process.argv.slice(2).join(" "));
  const fetchedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR", userAgent: MOBILE_UA });

  const naverOffers = await crawlNaver(page, query);
  const coupang = await crawlCoupang(page, query);
  const rawOffers = dedupeOffers([...naverOffers, ...coupang.offers]);
  const coffeeInfo = await enrichCoffeeInfo(page, rawOffers);
  const offers = applyCoffeeInfo(rawOffers, coffeeInfo);
  const result = {
    fetchedAt,
    query,
    sources: [
      { source: "naver", count: naverOffers.length, error: "" },
      { source: "coupang", count: coupang.offers.length, error: coupang.error },
    ],
    offers,
  };

  await browser.close();
  await saveJson("latest-offers.json", result);
  await saveJson("coffee-info.json", coffeeInfo);
  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
