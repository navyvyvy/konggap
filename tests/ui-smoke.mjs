import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const localUrl = "http://127.0.0.1:3000";
const smokeUrl = "http://127.0.0.1:3101";
const isRunning = (url) => fetch(url).then((response) => response.ok).catch(() => false);
const baseUrl = await isRunning(localUrl) ? localUrl : smokeUrl;
const server = baseUrl === localUrl ? null : spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3101"], {
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
    if (await isRunning(baseUrl)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 39) throw new Error("UI smoke server did not start");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(baseUrl);
      await page.getByText(payload.offers[0].name).waitFor();
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      assert.equal(await page.locator(".offerRow").count(), 1);
      assert.equal(await page.locator(".snapshotFacts").count(), 1);
      assert.equal(await page.locator(".heroTipsLink").count(), 0);
      assert.equal(await page.locator("#coffee-tips .brewTipsTabs button").count(), 5);
      assert.equal(await page.getByText("최근 반영").isVisible(), true);
      assert.equal(await page.locator(".offerTitle").getAttribute("href"), payload.offers[0].sourceUrl);
      const panelBeforeFilters = await page.locator(".toolPanel").boundingBox();
      await page.getByLabel("현재 목록 검색").fill("예가체프");
      assert.equal(await page.locator(".offerRow").count(), 1);
      await page.getByLabel("목록 검색어 지우기").click();
      assert.equal(await page.getByLabel("현재 목록 검색").inputValue(), "");
      await page.getByRole("button", { name: "테스트몰" }).click();
      assert.equal(await page.getByLabel("현재 목록 검색").inputValue(), "테스트몰");
      await page.getByRole("button", { name: "워시드" }).click();
      assert.equal(await page.locator(".filterBar").count(), 1);
      assert.equal(await page.locator(".filterBar select").nth(1).inputValue(), "워시드");
      const panelAfterFilters = await page.locator(".toolPanel").boundingBox();
      assert.ok(panelBeforeFilters && panelAfterFilters && Math.abs(panelBeforeFilters.height - panelAfterFilters.height) <= 1);
      const box = await page.locator(".offerRow").boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 1);
      await page.close();
    }

    for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 768, height: 820 }]) {
      const page = await browser.newPage({ viewport });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(`${baseUrl}/#coffee-tips`);
      await page.getByText(payload.offers[0].name).waitFor();
      await page.locator(".brewTips").scrollIntoViewIfNeeded();
      for (const tab of ["원두·장비", "사전 세팅", "핫 레시피", "아이스", "맛 조절"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        const deckBox = await page.locator(".brewTips").boundingBox();
        assert.ok(deckBox && Math.abs(deckBox.y) <= 2, `${viewport.width}px ${tab} 화면 정렬 (${deckBox?.y}px)`);
        const layout = await page.locator(".brewSlideCopy").evaluate((element) => ({
          horizontal: element.scrollWidth - element.clientWidth,
          vertical: element.scrollHeight - element.clientHeight,
        }));
        assert.ok(layout.horizontal <= 1, `${viewport.width}px ${tab} 가로 넘침`);
        assert.ok(layout.vertical <= 1, `${viewport.width}px ${tab} 세로 넘침`);
        await page.locator(".brewSlideVisual img").evaluate((image) => image.complete ? undefined : new Promise((resolve, reject) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", reject, { once: true });
        }));
        assert.equal(await page.locator(".brewSlideVisual img").evaluate((image) => image.complete && image.naturalWidth > 0), true);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(baseUrl);
      await page.locator("#guide").scrollIntoViewIfNeeded();
      const atlasBox = await page.locator(".originAtlas").boundingBox();
      assert.ok(atlasBox && Math.abs(atlasBox.height - 793) <= 1);
      assert.equal(await page.locator(".siteFooter a").count(), 0);
      assert.equal(await page.getByRole("heading", { name: "산지별 커피 도감" }).isVisible(), true);
      assert.equal(await page.locator(".originTab").count() > 10, true);
      const firstImage = await page.locator(".originImage").getAttribute("src");
      assert.equal(await page.getByText("사진 1 / 3").isVisible(), true);
      await page.getByRole("button", { name: "다음 사진" }).click();
      assert.equal(await page.getByText("사진 2 / 3").isVisible(), true);
      assert.notEqual(await page.locator(".originImage").getAttribute("src"), firstImage);
      await page.getByRole("button", { name: "콜롬비아", exact: true }).click();
      assert.equal(await page.getByRole("heading", { name: "콜롬비아", exact: true }).isVisible(), true);
      assert.notEqual(await page.locator(".originImage").getAttribute("src"), firstImage);
      await page.getByRole("button", { name: "잠비아", exact: true }).click();
      assert.equal(await page.getByRole("heading", { name: "잠비아", exact: true }).isVisible(), true);
      assert.equal(await page.getByRole("button", { name: "다음 산지 보기" }).isVisible(), true);
      assert.equal(await page.locator(".footerInfoGrid section").count(), 6);
      assert.equal(await page.locator(".footerClosing details").count(), 0);
      await page.evaluate(() => window.scrollTo(0, document.querySelector("#guide").offsetTop));
      const guideScrollTop = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 550);
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate((before) => window.scrollY > before, guideScrollTop));
      assert.equal(await page.getByRole("heading", { name: "커피 정보 읽는 법" }).isVisible(), true);
      assert.equal(await page.getByRole("heading", { name: "향미와 컵 평가" }).isVisible(), true);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator(".footerInfoGrid section:visible").count(), 2);
      await page.getByRole("tab", { name: "향미·평가" }).click();
      assert.equal(await page.getByRole("heading", { name: "향미와 컵 평가" }).isVisible(), true);
      for (const width of [320, 280]) {
        await page.setViewportSize({ width, height: 700 });
        for (const topic of ["등급·생두", "품종·이력", "향미·평가"]) {
          await page.getByRole("tab", { name: topic }).click();
          assert.equal(await page.locator(".footerGuidePanel[data-active=true] section").evaluateAll((sections) => sections.some((section) => section.scrollHeight > section.clientHeight + 1)), false);
          assert.equal(await page.locator(".footerGuidePanel[data-active=true] dl").evaluateAll((tables) => tables.some((table) => table.scrollWidth > table.clientWidth + 1)), false);
          assert.equal(await page.locator(".footerGuidePanel[data-active=true] dl > div").evaluateAll((rows) => rows.some((row) => getComputedStyle(row).gridTemplateColumns.split(" ").length > 1)), false);
          assert.equal(await page.locator(".footerGuidePanel[data-active=true] dt, .footerGuidePanel[data-active=true] dd").evaluateAll((cells) => cells.some((cell) => cell.scrollWidth > cell.clientWidth + 1)), false);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      }
      await page.setViewportSize({ width: 320, height: 700 });
      await page.getByRole("button", { name: "에티오피아", exact: true }).click();
      const originLayout = await page.locator(".originProfile").evaluate((profile) => ({
        horizontal: profile.scrollWidth - profile.clientWidth,
        vertical: profile.scrollHeight - profile.clientHeight,
      }));
      assert.ok(originLayout.horizontal <= 1, "320px 산지 정보 가로 넘침");
      assert.ok(originLayout.vertical <= 1, "320px 산지 정보 세로 넘침");
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server?.kill();
}
