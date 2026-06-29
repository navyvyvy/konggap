import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const MAX_OFFERS = 200;
const DATA_DIR = "data";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const SPECIALTY_SITE_QUERIES = [
  "site:coffeecg.com 생두 1kg",
  "site:coffeesys.co.kr 생두 1kg",
  "site:gsc.coffee 생두 1kg",
  "site:coffeecg.com 브라질 생두 1kg",
  "site:coffeecg.com 콜롬비아 생두 1kg",
  "site:coffeecg.com 에티오피아 생두 1kg",
  "site:coffeecg.com 케냐 생두 1kg",
  "site:coffeecg.com 과테말라 생두 1kg",
  "site:coffeesys.co.kr 브라질 생두 1kg",
  "site:coffeesys.co.kr 콜롬비아 생두 1kg",
  "site:coffeesys.co.kr 에티오피아 생두 1kg",
  "site:coffeesys.co.kr 케냐 생두 1kg",
  "site:coffeesys.co.kr 과테말라 생두 1kg",
  "site:gsc.coffee 브라질 생두 1kg",
  "site:gsc.coffee 콜롬비아 생두 1kg",
  "site:gsc.coffee 에티오피아 생두 1kg",
  "site:gsc.coffee 케냐 생두 1kg",
  "site:gsc.coffee 과테말라 생두 1kg",
  "site:coffeelibre.kr 생두",
  "site:coffeeplant.co.kr 생두",
  "site:momos.co.kr 생두",
  "site:rehmcoffee.co.kr 생두 1kg",
  "site:m.almacielo.com 생두 1kg",
  "site:m.sopexkorea.com 생두 1kg",
];
const DIRECT_SHOP_PAGES = [
  { url: "https://www.coffeesys.co.kr/product/list.html?cate_no=24", seller: "커피시스", needsWeight: true },
  { url: "https://rehmcoffee.co.kr", seller: "레햄코리아" },
  { url: "https://m.almacielo.com", seller: "알마씨엘로" },
  { url: "https://m.sopexkorea.com", seller: "소펙스코리아" },
  { url: "https://coffeeplant.co.kr/", seller: "생두몰" },
  { url: "https://momos.co.kr/category/%EC%83%9D%EB%91%90/64/", seller: "모모스커피" },
  { url: "https://coffeelibre.kr/category/%EC%83%9D%EB%91%90/56/", seller: "커피리브레" },
];

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

function moneyTextToNumber(line) {
  const match = line.match(/(\d[\d,]*)원/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function cleanTitle(line) {
  return line
    .replace(/^구매\s*[\d,.]+\+?\s*/, "")
    .replace(/^상품명\s*[:：]\s*/, "")
    .replace(/^:\s*/, "")
    .replace(/\s+\d[\d,]*원.*$/, "")
    .trim();
}

function isProductTitle(line) {
  return isBuyableGreenBeanOffer(line);
}

function isBuyableGreenBeanOffer(title, source = "naver") {
  if (isBlockedShoppingTitle(title) || !/\d+\s*(kg|g)/i.test(title)) return false;
  if (/생두|커피생두|green\s*bean/i.test(title)) return true;
  return source === "shop" && isCoffeeProductName(title);
}

function isBlockedShoppingTitle(title) {
  return /([2-9]\d*\s*개|세트|묶음|박스|box|set|원두|드립백|캡슐|콜드브루|더치|분쇄|그라인더|필터|드리퍼|서버|로스팅\s*(망|기|서비스)|당일\s*로스팅|당일로스팅)/i.test(title);
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

async function crawlSpecialtySites(page) {
  const offers = [];

  for (const query of SPECIALTY_SITE_QUERIES) {
    await page.goto(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(1200);
    offers.push(...(await collectSpecialtyPageOffers(page)));
  }

  offers.push(...(await crawlDirectShopPages(page)));
  return dedupeOffers(offers);
}

async function crawlDirectShopPages(page) {
  const offers = [];

  for (const shop of DIRECT_SHOP_PAGES) {
    await page.goto(shop.url, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null);
    await page.waitForTimeout(1500);
    offers.push(...(await collectDirectShopOffers(page, shop)));
  }

  return offers;
}

async function collectDirectShopOffers(page, shop) {
  const items = await page.evaluate(() => {
    const productCards = [...document.querySelectorAll('li[id^="anchorBoxId_"], .prdList > li, .shop-item')];
    const nodes = productCards.length ? productCards : [...document.querySelectorAll("a[href]")];

    return nodes.map((node) => {
      let container = node;
      if (node instanceof HTMLAnchorElement) {
        for (let index = 0; index < 5 && container.parentElement; index += 1) {
          if (/\d[\d,]*원/.test(container.innerText || container.textContent || "")) break;
          container = container.parentElement;
        }
      }

      const lines = (container.innerText || container.textContent || "").split("\n").map((line) => line.trim()).filter(Boolean);
      const anchors = [...container.querySelectorAll("a[href]")];
      const title =
        lines.find((line) => !/^(ADD|WISH|NEW|SOLD OUT|\d[\d,]*원|판매가\s*[:：]|컵노트\s*[:：]|[\d\s]+)$/.test(line)) ??
        anchors.map((anchor) => (anchor.innerText || anchor.textContent || "").replace(/\s+/g, " ").trim()).find(Boolean) ??
        "";
      const link = anchors.map((anchor) => anchor.href).find((href) => !/javascript:|#/.test(href)) ?? (node instanceof HTMLAnchorElement ? node.href : "");

      return { title, link, lines };
    });
  });

  return items
    .map((item) => parseDirectShopOffer(item, shop))
    .filter(Boolean);
}

function parseDirectShopOffer(item, shop) {
  let title = cleanTitle(item.title);
  if (!title || /생두컨시어지|신규생두|공지|친구|소분 생두|카테고리|전체보기|사업자|20kg 지대/.test(title)) return null;
  if (isBlockedShoppingTitle(title) || (!/생두|커피생두|green\s*bean/i.test(title) && !isCoffeeProductName(title))) return null;

  const context = item.lines.join(" ");
  if (shop.needsWeight && !/\b1kg\b|1kg|1KG|1kg 소포장/i.test(context)) return null;

  const prices = item.lines.map(moneyTextToNumber).filter((price) => price > 0);
  const price = prices.at(-1) ?? 0;
  if (!price) return null;

  if (!/\d+\s*(kg|g)/i.test(title)) title = `${title} 1kg`;
  return { title, link: item.link, price, shippingFee: null, seller: shop.seller, source: "shop" };
}

function isCoffeeProductName(title) {
  return /(브라질|콜롬비아|에티오피아|케냐|과테말라|니카라과|온두라스|페루|동티모르|자메이카|인도|코스타리카|엘살바도르|멕시코|볼리비아|에콰도르|르완다|만델링|로부스타|아라비카|수프리모|예가체프|시다모|안티구아|세하도|워시드|내추럴|Brazil|Colombia|Ethiopia|Kenya|Guatemala|Nicaragua|Honduras|Peru|Costa Rica|Bolivia|Ecuador|Rwanda|Washed|Natural|Honey)/i.test(title);
}

async function collectSpecialtyPageOffers(page) {
  const items = await page.evaluate(() => [...document.querySelectorAll("a[href]")]
    .map((anchor) => {
      let container = anchor;
      for (let index = 0; index < 4 && container.parentElement; index += 1) {
        if (/(판매가|배송비|원)/.test(container.innerText || container.textContent || "")) break;
        container = container.parentElement;
      }

      return {
        title: (anchor.innerText || anchor.textContent || "").replace(/\s+/g, " ").trim(),
        link: anchor.href,
        lines: (container.innerText || container.textContent || "").split("\n").map((line) => line.trim()).filter(Boolean),
      };
    })
    .filter((item) =>
      /coffeecg|coffeesys|gsc\.coffee|rehmcoffee|almacielo|sopexkorea|coffeelibre|coffeeplant|momos/.test(item.link) &&
      /생두|커피생두/.test(item.title) &&
      /\d+\s*(kg|g)/i.test(item.title),
    ));

  return items.map((item) => parseSpecialtyOffer(item)).filter(Boolean);
}

function parseSpecialtyOffer(item) {
  const title = cleanTitle(item.title);
  if (!isProductTitle(title)) return null;
  if (/식품의 유형|배송비|판매가|www\.|›/.test(title)) return null;

  const priceLine = item.lines.find((line) => /판매가\s*[:：]/.test(line)) ?? item.lines.find((line) => /^\d[\d,]*원/.test(line));
  const price = moneyLineToNumber((priceLine ?? "").replace(/^.*판매가\s*[:：]\s*/, "").split(/[·;]/)[0].trim());
  const shippingLine = item.lines.find((line) => /배송비/.test(line)) ?? "";
  const shippingFee = moneyLineToNumber(shippingLine.replace(/^.*배송비\s*[:：]\s*/, "").split(/[()·;]/)[0].trim()) || (/무료/.test(shippingLine) ? 0 : 3000);

  if (!price) return null;
  return { title, link: item.link, price, shippingFee, seller: sellerFromUrl(item.link), source: "shop" };
}

function sellerFromUrl(url) {
  if (/coffeecg/.test(url)) return "커피창고";
  if (/coffeesys/.test(url)) return "커피시스";
  if (/gsc\.coffee/.test(url)) return "GSC";
  if (/rehmcoffee/.test(url)) return "레햄코리아";
  if (/almacielo/.test(url)) return "알마씨엘로";
  if (/sopexkorea/.test(url)) return "소펙스코리아";
  if (/coffeelibre/.test(url)) return "커피리브레";
  if (/coffeeplant/.test(url)) return "생두몰";
  if (/momos/.test(url)) return "모모스커피";
  return "전문몰";
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
    const link = offer.link?.trim();
    const key = link ? `link:${link}` : `item:${offer.source}:${offer.title}:${offer.price}:${offer.shippingFee ?? ""}`;
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
  const shopOffers = await crawlSpecialtySites(page);
  const rawOffers = dedupeOffers([...naverOffers, ...shopOffers]);
  const coffeeInfo = await enrichCoffeeInfo(page, rawOffers);
  const offers = applyCoffeeInfo(rawOffers, coffeeInfo);
  const result = {
    fetchedAt,
    query,
    sources: [
      { source: "naver", count: naverOffers.length, error: "" },
      { source: "shop", count: shopOffers.length, error: "" },
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
