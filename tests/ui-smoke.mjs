import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 3101;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: "0" },
  stdio: "ignore",
});

const payload = {
  fetchedAt: "2026-07-10T00:00:00.000Z",
  offers: [{
    id: "smoke-1",
    name: "에티오피아 예가체프 G1 워시드 생두 1kg",
    seller: "테스트몰",
    source: "shop",
    sourceUrl: "https://example.com/coffee",
    price: 18000,
    shippingFee: 3000,
    flavorTags: ["워시드"],
    roastTags: ["약배전"],
    tasteNote: "꽃향, 시트러스",
    rawDescription: "",
    fetchedAt: "2026-07-10T00:00:00.000Z",
    finalPrice: 21000,
    shippingKnown: true,
  }],
};

try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await fetch(`http://127.0.0.1:${port}`).then((response) => response.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 39) throw new Error("UI smoke server did not start");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(`http://127.0.0.1:${port}`);
      await page.getByText(payload.offers[0].name).waitFor();
      assert.equal(await page.locator(".offerRow").count(), 1);
      assert.equal(await page.locator(".offerTitle").getAttribute("href"), payload.offers[0].sourceUrl);
      const box = await page.locator(".offerRow").boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 1);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
