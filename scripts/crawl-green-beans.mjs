import { chromium } from "playwright";

function greenBeanQuery(query) {
  const trimmed = query.trim() || "생두";
  return /생두|green\s*bean/i.test(trimmed) ? trimmed : `${trimmed} 생두`;
}

function moneyLineToNumber(line) {
  const match = line.trim().match(/^(\d[\d,]*)원$/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function parsePrice(context, title) {
  const lines = context.split("\n").map((line) => line.trim()).filter(Boolean);
  const titleIndex = lines.findIndex((line) => line.includes(title));
  const candidates = lines.slice(Math.max(0, titleIndex), titleIndex === -1 ? lines.length : titleIndex + 8);

  for (const line of candidates) {
    if (/배송비|쿠폰|할인|포인트|찜|구매|^\d+(\.\d+)?$/.test(line)) continue;
    const price = moneyLineToNumber(line);
    if (price > 0) return price;
  }

  return 0;
}

function parseShipping(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => line === "배송비");
  return index >= 0 ? moneyLineToNumber(lines[index + 1] ?? "") || null : null;
}

async function main() {
  const query = greenBeanQuery(process.argv.slice(2).join(" "));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR" });

  await page.goto(`https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  const offers = await page.evaluate(() => {
    const textOf = (node) => (node.textContent ?? "").replace(/\s+/g, " ").trim();
    const blockTextOf = (node) => node.innerText ?? textOf(node);
    const productLinks = [...document.querySelectorAll("a[href]")]
      .map((link) => {
        let container = link;
        for (let i = 0; i < 5 && container.parentElement; i += 1) {
          if (/원/.test(textOf(container))) break;
          container = container.parentElement;
        }

        return {
          title: textOf(link),
          href: link.href,
          context: blockTextOf(container),
        };
      })
      .filter((item) =>
        item.href &&
        /생두|커피생두/.test(item.title) &&
        /\d+\s*(kg|g)/i.test(item.title) &&
        /원/.test(item.context) &&
        !/블로그|클립|협찬/.test(item.href),
      );

    return productLinks.slice(0, 100);
  });

  await browser.close();

  const normalized = offers
    .map((item, index) => ({
      title: item.title,
      link: new URL(item.href, "https://search.naver.com").toString(),
      price: parsePrice(item.context, item.title),
      shippingFee: parseShipping(item.context),
      seller: "네이버",
      source: "naver",
      index,
    }))
    .filter((item) => item.price > 0);

  process.stdout.write(JSON.stringify({ offers: normalized }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
