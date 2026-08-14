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
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.route("**/api/offers?**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.fulfill({ json: payload });
      });
      const navigation = page.goto(baseUrl);
      await page.locator(".loadingRow").first().waitFor();
      assert.equal(await page.locator(".loadingRow").count(), 8);
      assert.equal(await page.locator(".summarySkeleton").count(), 2);
      await navigation;
      await page.getByText(payload.offers[0].name).waitFor();
      await page.close();
    }

    for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 760 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(baseUrl);
      await page.getByText(payload.offers[0].name).waitFor();
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      const sectionLayout = await page.evaluate(() => {
        const selectors = [".page", ".footerClosing", ".brewTips"];
        const sections = selectors.map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { top: rect.top + window.scrollY, height: rect.height };
        });
        const siteFooter = document.querySelector(".siteFooter").getBoundingClientRect();
        return [sections[0], { top: siteFooter.top + window.scrollY, height: sections[1].top - (siteFooter.top + window.scrollY) }, sections[1], sections[2]];
      });
      sectionLayout.forEach((section, index) => {
        assert.ok(Math.abs(section.top - viewport.height * index) <= 1, `${viewport.width}px ${index + 1}번째 섹션 시작점`);
        assert.ok(Math.abs(section.height - viewport.height) <= 1, `${viewport.width}px ${index + 1}번째 섹션 높이`);
      });
      assert.equal(await page.locator(".offerRow").count(), 1);
      assert.equal(await page.locator(".snapshotFacts").count(), 1);
      assert.equal(await page.locator(".heroTipsLink").count(), 0);
      assert.equal(await page.locator(".heroSectionNav a").count(), 4);
      assert.equal(await page.locator('.heroSectionNav a[aria-current="page"]').textContent(), "가격표");
      assert.equal(await page.locator(".heroSectionNav a").evaluateAll((links) => links.some((link) => link.scrollWidth > link.clientWidth + 1)), false);
      assert.equal(await page.locator("#coffee-tips .brewTipsTabs button").count(), 10);
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

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(baseUrl);
      await page.getByText(payload.offers[0].name).waitFor();
      await page.evaluate(() => {
        window.open = (url) => {
          window.__openedSellerUrl = String(url);
          return null;
        };
      });
      await page.getByRole("button", { name: "찜하기" }).press("Enter");
      assert.equal(await page.evaluate(() => window.__openedSellerUrl ?? ""), "", "찜 키 입력이 판매처 링크로 전파되지 않음");
      await page.locator(".offerRow .favoriteButton").press("Enter");
      await page.locator(".offerRow").press("Enter");
      assert.equal(await page.evaluate(() => window.__openedSellerUrl), payload.offers[0].sourceUrl, "행 키 입력은 판매처를 엶");
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(baseUrl);
      await page.getByText(payload.offers[0].name).waitFor();
      await page.mouse.move(2, 400);
      await page.mouse.wheel(0, 640);
      await page.waitForTimeout(650);
      assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - 800) <= 1, "첫 휠에서 산지 섹션으로 이동");
      await page.mouse.wheel(0, 640);
      await page.waitForTimeout(650);
      assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - 1600) <= 1, "두 번째 휠에서 읽는 법 섹션으로 이동");
      await page.close();
    }

    for (const viewport of [{ width: 280, height: 568 }, { width: 320, height: 700 }, { width: 390, height: 844 }, { width: 768, height: 820 }]) {
      const page = await browser.newPage({ viewport });
      await page.route("**/api/offers?**", (route) => route.fulfill({ json: payload }));
      await page.goto(`${baseUrl}/#coffee-tips`);
      await page.getByText(payload.offers[0].name).waitFor();
      await page.locator(".brewTips").scrollIntoViewIfNeeded();
      assert.equal(await page.locator(".brewTipsHeader > div strong").evaluate((title) => title.scrollWidth <= title.clientWidth + 1), true, `${viewport.width}px 입문 노트 제목 잘림`);
      const tipTabsFit = await page.locator(".brewTipsTabs button").evaluateAll((tabs) => tabs.every((tab) => {
        const box = tab.getBoundingClientRect();
        const parent = tab.parentElement.getBoundingClientRect();
        return box.left >= parent.left - 1 && box.right <= parent.right + 1 && tab.scrollWidth <= tab.clientWidth + 1;
      }));
      assert.equal(tipTabsFit, true, `${viewport.width}px 입문 노트 탭 잘림`);
      for (const tab of ["원두 입문", "시기·보관", "저울·분쇄", "포트·드리퍼", "필터·잔", "추출 준비", "린싱", "핫", "아이스", "맛 조절"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        const deckBox = await page.locator(".brewTips").boundingBox();
        assert.ok(deckBox && Math.abs(deckBox.y) <= 2, `${viewport.width}px ${tab} 화면 정렬 (${deckBox?.y}px)`);
        const layout = await page.locator(".brewSlideCopy").evaluate((element) => ({
          horizontal: element.scrollWidth - element.clientWidth,
          vertical: element.scrollHeight - element.clientHeight,
        }));
        assert.ok(layout.horizontal <= 1, `${viewport.width}px ${tab} 가로 넘침`);
        assert.equal(await page.locator(".brewSlideCopy dl > div, .brewSlideCopy ol > li, .brewSlideCopy .brewSequence").evaluateAll((rows) => rows.every((row) => row.scrollWidth <= row.clientWidth + 1)), true, `${viewport.width}px ${tab} 표 잘림`);
        if (layout.vertical > 1) {
          const scrollState = await page.locator(".brewSlideCopy").evaluate((element) => {
            element.scrollTop = element.scrollHeight;
            return {
              overflow: getComputedStyle(element).overflowY,
              reachedEnd: element.scrollTop >= element.scrollHeight - element.clientHeight - 1,
            };
          });
          assert.equal(scrollState.overflow, "auto", `${viewport.width}px ${tab} 본문 스크롤`);
          assert.equal(scrollState.reachedEnd, true, `${viewport.width}px ${tab} 마지막 문장 접근`);
        }
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
      assert.equal(await page.locator(".originSignals > div").count(), 3);
      const firstImage = await page.locator(".originImage").getAttribute("src");
      assert.equal(await page.getByText("사진 1 / 3").isVisible(), true);
      await page.getByRole("button", { name: "다음 사진" }).click();
      assert.equal(await page.getByText("사진 2 / 3").isVisible(), true);
      assert.notEqual(await page.locator(".originImage").getAttribute("src"), firstImage);
      await page.getByRole("button", { name: "콜롬비아", exact: true }).click();
      assert.equal(await page.getByRole("heading", { name: "콜롬비아", exact: true }).isVisible(), true);
      assert.notEqual(await page.locator(".originImage").getAttribute("src"), firstImage);
      const lastOrigin = (await page.locator(".originTab").last().textContent())?.trim();
      await page.locator(".originTab").last().click();
      assert.equal(await page.getByRole("heading", { name: lastOrigin, exact: true }).isVisible(), true);
      assert.equal(await page.getByRole("button", { name: "다음 산지 보기" }).isVisible(), true);
      assert.equal(await page.locator(".footerInfoGrid section").count(), 1);
      assert.equal(await page.locator(".footerClosing details").count(), 0);
      await page.evaluate(() => window.scrollTo(0, document.querySelector("#guide").offsetTop));
      const guideScrollTop = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 550);
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate((before) => window.scrollY > before, guideScrollTop));
      assert.equal(await page.getByRole("heading", { name: "커피 정보 읽는 법" }).isVisible(), true);
      await page.getByRole("button", { name: "다음 커피 정보" }).click();
      assert.equal(await page.getByRole("heading", { name: "스크린·수분·결점" }).isVisible(), true);
      await page.getByRole("tab", { name: "향미" }).click();
      assert.equal(await page.getByRole("heading", { name: "향미와 컵 평가" }).isVisible(), true);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator(".footerInfoGrid section").count(), 1);
      await page.getByRole("tab", { name: "향미" }).click();
      assert.equal(await page.getByRole("heading", { name: "향미와 컵 평가" }).isVisible(), true);
      for (const width of [320, 280]) {
        await page.setViewportSize({ width, height: 700 });
        const guideNavBounds = await page.locator(".footerTopicTabs").boundingBox();
        const guideTabsFit = await page.locator(".footerTopicTabs button").evaluateAll((tabs) => tabs.every((tab) => {
          const box = tab.getBoundingClientRect();
          const parent = tab.parentElement.getBoundingClientRect();
          return box.left >= parent.left - 1 && box.right <= parent.right + 1;
        }));
        assert.ok(guideNavBounds && guideTabsFit, `${width}px 안내 탭 잘림`);
        for (const topic of ["등급", "생두", "품종", "가공", "이력", "향미"]) {
          await page.locator(".footerTopicTabs").getByRole("tab", { name: topic, exact: true }).click();
          await page.locator(".footerGuideVisual img").evaluate((image) => image.complete ? undefined : new Promise((resolve, reject) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", reject, { once: true });
          }));
          assert.equal(await page.locator(".footerGuideVisual img").evaluate((image) => image.complete && image.naturalWidth > 0), true);
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
