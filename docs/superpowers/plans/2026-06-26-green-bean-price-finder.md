# Green Bean Price Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small responsive green bean offer list that fetches current purchasable offers at query time and links each row to the seller.

**Architecture:** Use a minimal Next.js App Router app. Keep business logic in pure TypeScript modules, expose query-time offers through one route handler, and render a dense client-side list with infinite scroll. Start with Naver Shopping API because it is structured and supports `display=100`; keep the source adapter boundary small so Coupang/protected sources can be added without rewriting the UI.

**Tech Stack:** Next.js App Router, React, TypeScript, plain CSS, Node built-in test runner with `tsx`.

---

## File Structure

- Create `package.json`: scripts and dependencies.
- Create `tsconfig.json`, `next-env.d.ts`, `next.config.ts`: minimal Next/TypeScript setup.
- Create `app/layout.tsx`, `app/page.tsx`, `app/globals.css`: app shell and visual system.
- Create `app/api/offers/route.ts`: GET endpoint for query-time offer fetch.
- Create `src/lib/offers.ts`: types, normalization, pagination helpers.
- Create `src/lib/sources/naver.ts`: Naver Shopping source adapter.
- Create `src/lib/flavor-cache.ts`: conservative flavor/roast note cache.
- Create `components/OfferSearch.tsx`: client fetch, filters, infinite scroll.
- Create `components/OfferRow.tsx`: responsive row/card link.
- Create `tests/offers.test.ts`: logic checks for normalization, pagination, cache key.

## Task 1: Minimal App Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "node --import tsx --test tests/*.test.ts"
  },
  "dependencies": {
    "next": "^16.2.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 3: Create TypeScript/Next config**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next-env.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create app shell**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "생두 가격 비교",
  description: "조회 시점 생두 가격 비교 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { OfferSearch } from "../components/OfferSearch";

export default function Home() {
  return <OfferSearch />;
}
```

- [ ] **Step 5: Add dense base CSS**

```css
/* app/globals.css */
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #f7f7f4;
  color: #20201d;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a { color: inherit; text-decoration: none; }
button, input, select { font: inherit; }
```

- [ ] **Step 6: Verify shell**

Run:

```powershell
npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts app
git commit -m "chore: scaffold next app"
```

## Task 2: Offer Types And Normalization

**Files:**
- Create: `src/lib/offers.ts`
- Create: `tests/offers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/offers.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFlavorCacheKey,
  normalizeOffer,
  paginateOffers,
  stripHtml,
} from "../src/lib/offers";

test("stripHtml removes Naver bold tags", () => {
  assert.equal(stripHtml("<b>예가체프</b> 생두 2kg"), "예가체프 생두 2kg");
});

test("normalizeOffer calculates final price with known shipping", () => {
  const offer = normalizeOffer({
    id: "n-1",
    name: "<b>예가체프</b> 생두 2kg",
    seller: "테스트몰",
    source: "naver",
    sourceUrl: "https://example.com",
    price: 25000,
    shippingFee: 3000,
    fetchedAt: "2026-06-26T12:00:00.000Z",
  });
  assert.equal(offer.name, "예가체프 생두 2kg");
  assert.equal(offer.finalPrice, 28000);
});

test("paginateOffers returns the requested slice", () => {
  const offers = Array.from({ length: 30 }, (_, index) => ({ id: String(index) }));
  assert.deepEqual(paginateOffers(offers, 0, 25).map((offer) => offer.id), Array.from({ length: 25 }, (_, i) => String(i)));
  assert.deepEqual(paginateOffers(offers, 25, 25).map((offer) => offer.id), ["25", "26", "27", "28", "29"]);
});

test("buildFlavorCacheKey separates grade and process", () => {
  assert.notEqual(
    buildFlavorCacheKey("에티오피아 예가체프 G1 내추럴 생두 2kg"),
    buildFlavorCacheKey("에티오피아 예가체프 G2 워시드 생두 2kg")
  );
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test
```

Expected: FAIL because `src/lib/offers.ts` does not exist.

- [ ] **Step 3: Implement offer logic**

```ts
// src/lib/offers.ts
export type OfferSource = "naver" | "coupang" | "shop";

export type RawOffer = {
  id: string;
  name: string;
  seller: string;
  source: OfferSource;
  sourceUrl: string;
  price: number;
  shippingFee: number | null;
  flavorTags?: string[];
  roastTags?: string[];
  tasteNote?: string;
  rawDescription?: string;
  fetchedAt: string;
};

export type Offer = RawOffer & {
  finalPrice: number;
  shippingKnown: boolean;
};

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeOffer(raw: RawOffer): Offer {
  const shippingFee = raw.shippingFee ?? 0;
  return {
    ...raw,
    name: stripHtml(raw.name),
    flavorTags: raw.flavorTags ?? [],
    roastTags: raw.roastTags ?? [],
    tasteNote: raw.tasteNote ?? "",
    finalPrice: raw.price + shippingFee,
    shippingKnown: raw.shippingFee !== null,
  };
}

export function paginateOffers<T>(offers: T[], offset: number, pageSize: number) {
  return offers.slice(offset, offset + pageSize);
}

export function buildFlavorCacheKey(name: string) {
  const cleaned = stripHtml(name).toLowerCase();
  const grade = cleaned.match(/\bg[1-5]\b/i)?.[0] ?? "";
  const process = /(내추럴|natural|워시드|washed|허니|honey)/i.exec(cleaned)?.[0] ?? "";
  return `${cleaned.replace(/\b\d+(g|kg)\b/gi, "").trim()}|${grade}|${process}`;
}
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```powershell
npm test
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/offers.ts tests/offers.test.ts
git commit -m "feat: add offer normalization"
```

## Task 3: Query-Time Naver Source And API Route

**Files:**
- Create: `src/lib/sources/naver.ts`
- Create: `app/api/offers/route.ts`

- [ ] **Step 1: Create Naver source adapter**

```ts
// src/lib/sources/naver.ts
import type { RawOffer } from "../offers";

type NaverItem = {
  title: string;
  link: string;
  lprice: string;
  mallName: string;
  productId: string;
};

type NaverResponse = {
  items: NaverItem[];
};

export async function fetchNaverOffers(query: string, fetchedAt = new Date().toISOString()): Promise<RawOffer[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required");
  }

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "100");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("exclude", "used:rental:cbshop");

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver Shopping request failed: ${response.status}`);
  }

  const data = (await response.json()) as NaverResponse;
  return data.items.map((item) => ({
    id: `naver-${item.productId}`,
    name: item.title,
    seller: item.mallName,
    source: "naver",
    sourceUrl: item.link,
    price: Number(item.lprice),
    shippingFee: null,
    fetchedAt,
  }));
}
```

- [ ] **Step 2: Create API route**

```ts
// app/api/offers/route.ts
import { NextResponse } from "next/server";
import { normalizeOffer } from "../../../src/lib/offers";
import { fetchNaverOffers } from "../../../src/lib/sources/naver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "생두";
  const fetchedAt = new Date().toISOString();

  try {
    const rawOffers = await fetchNaverOffers(query, fetchedAt);
    const offers = rawOffers.map(normalizeOffer).filter((offer) => offer.price > 0);
    return NextResponse.json({ fetchedAt, offers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown offer fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify without credentials**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: build passes. Runtime API returns a 500 JSON error until `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` are set.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/sources/naver.ts app/api/offers/route.ts
git commit -m "feat: add query-time offer API"
```

## Task 4: Responsive Offer List UI

**Files:**
- Create: `components/OfferSearch.tsx`
- Create: `components/OfferRow.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create row component**

```tsx
// components/OfferRow.tsx
import type { Offer } from "../src/lib/offers";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function TruckIcon() {
  return (
    <svg className="truckIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

export function OfferRow({ offer }: { offer: Offer }) {
  return (
    <a className="offerRow" href={offer.sourceUrl} target="_blank" rel="noreferrer">
      <div className="offerInfo">
        <div className="offerTitle">{offer.name}</div>
        <div className="tags">
          {offer.flavorTags.map((tag) => <span className="tag flavorTag" key={tag}>{tag}</span>)}
          {offer.roastTags.map((tag) => <span className="tag roastTag" key={tag}>{tag}</span>)}
        </div>
        {offer.tasteNote ? <div className="tasteNote">{offer.tasteNote}</div> : null}
      </div>
      <div className="pricePanel">
        <div className="priceLabel">{offer.shippingKnown ? "최종 비용" : "상품가 기준"}</div>
        <div className="finalPrice">{formatWon(offer.finalPrice)}</div>
        <div className="costLine">
          <span>{formatWon(offer.price)}</span>
          <span className="shippingFee"><TruckIcon />{offer.shippingKnown ? formatWon(offer.shippingFee ?? 0) : "확인 필요"}</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Create client search component**

```tsx
// components/OfferSearch.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Offer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";

const PAGE_SIZE = 25;

type ApiResult = {
  fetchedAt: string;
  offers: Offer[];
  error?: string;
};

export function OfferSearch() {
  const [query, setQuery] = useState("생두");
  const [submittedQuery, setSubmittedQuery] = useState("생두");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setVisibleCount(PAGE_SIZE);
    fetch(`/api/offers?q=${encodeURIComponent(submittedQuery)}`)
      .then(async (response) => {
        const data = (await response.json()) as ApiResult;
        if (!response.ok) throw new Error(data.error || "조회 실패");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setOffers(data.offers);
        setFetchedAt(data.fetchedAt);
        setStatus(data.offers.length ? "ready" : "empty");
      })
      .catch((fetchError: Error) => {
        if (cancelled) return;
        setError(fetchError.message);
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [submittedQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, offers.length));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [offers.length]);

  const visibleOffers = useMemo(() => offers.slice(0, visibleCount), [offers, visibleCount]);

  return (
    <main className="page">
      <form
        className="searchBar"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedQuery(query.trim() || "생두");
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="검색어" />
        <button type="submit">조회</button>
      </form>

      {fetchedAt ? <div className="timestamp">{new Date(fetchedAt).toLocaleString("ko-KR")} 기준</div> : null}

      {status === "loading" ? <div className="state">조회 중</div> : null}
      {status === "empty" ? <div className="state">현재 조건에 맞는 구매 가능 생두가 없습니다.</div> : null}
      {status === "error" ? <div className="state">조회 실패: {error}</div> : null}

      {status === "ready" ? (
        <div className="offerList">
          {visibleOffers.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
          <div ref={sentinelRef} className="sentinel" />
        </div>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 3: Add responsive CSS**

```css
/* append to app/globals.css */
.page { max-width: 980px; margin: 0 auto; padding: 18px; }
.searchBar { display: flex; gap: 8px; margin-bottom: 10px; }
.searchBar input { flex: 1; min-width: 0; border: 1px solid #c9c9c2; border-radius: 8px; padding: 9px 10px; }
.searchBar button { border: 0; border-radius: 8px; padding: 9px 12px; background: #2f4a33; color: #fff; font-weight: 800; cursor: pointer; }
.timestamp { margin: 0 0 8px; color: #62625b; font-size: 13px; }
.state { background: #fff; border: 1px solid #d9d9d2; border-radius: 8px; padding: 16px; }
.offerList { background: #fff; border: 1px solid #d9d9d2; border-radius: 8px; overflow: hidden; }
.offerRow { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 14px; padding: 12px 14px; border-bottom: 1px solid #e2e2dd; cursor: pointer; }
.offerRow:last-child { border-bottom: 0; }
.offerTitle { font-size: 20px; line-height: 1.32; font-weight: 900; overflow-wrap: anywhere; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.tag { white-space: nowrap; border-radius: 999px; padding: 2px 7px; font-size: 12px; }
.flavorTag { background: #f1f1ed; }
.roastTag { background: #e6efe7; border: 1px solid #bad2bf; }
.tasteNote { margin-top: 7px; color: #5b5b54; font-size: 13px; line-height: 1.35; }
.pricePanel { border-left: 1px solid #d9d9d2; padding-left: 14px; }
.priceLabel { color: #66665f; font-size: 12px; }
.finalPrice { white-space: nowrap; font-size: 34px; line-height: 1.05; font-weight: 950; }
.costLine { display: flex; flex-wrap: wrap; gap: 7px 12px; margin-top: 10px; font-size: 14px; }
.costLine span { white-space: nowrap; }
.shippingFee { display: inline-flex; align-items: center; gap: 4px; }
.truckIcon { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2; fill: none; }
.sentinel { height: 1px; }
@media (max-width: 720px) {
  .page { padding: 14px; }
  .offerRow { grid-template-columns: 1fr; gap: 10px; padding: 12px; }
  .pricePanel { border-left: 0; border-top: 1px solid #dcdcd5; padding: 10px 0 0; }
  .offerTitle { font-size: 20px; }
  .finalPrice { font-size: 32px; }
}
```

- [ ] **Step 4: Verify UI builds**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```powershell
git add components app
git commit -m "feat: render responsive offer list"
```

## Task 5: Filters, Sorting, And Flavor Cache

**Files:**
- Modify: `src/lib/offers.ts`
- Create: `src/lib/flavor-cache.ts`
- Modify: `components/OfferSearch.tsx`
- Modify: `tests/offers.test.ts`

- [ ] **Step 1: Extend offer helpers**

```ts
// append to src/lib/offers.ts
export function sortByFinalPrice(offers: Offer[]) {
  return [...offers].sort((a, b) => a.finalPrice - b.finalPrice);
}

export function filterByPriceRange(offers: Offer[], min: number | null, max: number | null) {
  return offers.filter((offer) => {
    if (min !== null && offer.finalPrice < min) return false;
    if (max !== null && offer.finalPrice > max) return false;
    return true;
  });
}
```

- [ ] **Step 2: Add cache module**

```ts
// src/lib/flavor-cache.ts
import { buildFlavorCacheKey } from "./offers";

export type FlavorCacheEntry = {
  flavorTags: string[];
  roastTags: string[];
  tasteNote: string;
  analyzedAt: string;
};

const cache = new Map<string, FlavorCacheEntry>();

export function getFlavorCache(name: string) {
  return cache.get(buildFlavorCacheKey(name)) ?? null;
}

export function setFlavorCache(name: string, entry: FlavorCacheEntry) {
  cache.set(buildFlavorCacheKey(name), entry);
}
```

- [ ] **Step 3: Add tests**

```ts
// append to tests/offers.test.ts
import { filterByPriceRange, sortByFinalPrice } from "../src/lib/offers";

test("sortByFinalPrice orders low to high", () => {
  const offers = [
    normalizeOffer({ id: "b", name: "b", seller: "s", source: "naver", sourceUrl: "https://b.test", price: 2000, shippingFee: 0, fetchedAt: "2026-06-26T12:00:00.000Z" }),
    normalizeOffer({ id: "a", name: "a", seller: "s", source: "naver", sourceUrl: "https://a.test", price: 1000, shippingFee: 0, fetchedAt: "2026-06-26T12:00:00.000Z" }),
  ];
  assert.deepEqual(sortByFinalPrice(offers).map((offer) => offer.id), ["a", "b"]);
});

test("filterByPriceRange respects min and max", () => {
  const offers = [
    normalizeOffer({ id: "a", name: "a", seller: "s", source: "naver", sourceUrl: "https://a.test", price: 1000, shippingFee: 0, fetchedAt: "2026-06-26T12:00:00.000Z" }),
    normalizeOffer({ id: "b", name: "b", seller: "s", source: "naver", sourceUrl: "https://b.test", price: 3000, shippingFee: 0, fetchedAt: "2026-06-26T12:00:00.000Z" }),
  ];
  assert.deepEqual(filterByPriceRange(offers, 2000, 4000).map((offer) => offer.id), ["b"]);
});
```

- [ ] **Step 4: Wire min/max filters in `OfferSearch`**

Add state:

```tsx
const [minPrice, setMinPrice] = useState("");
const [maxPrice, setMaxPrice] = useState("");
```

Add inputs inside `.searchBar` after the query input:

```tsx
<input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} inputMode="numeric" aria-label="최소 가격" placeholder="최소" />
<input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="numeric" aria-label="최대 가격" placeholder="최대" />
```

Replace `visibleOffers` calculation:

```tsx
const filteredOffers = useMemo(() => {
  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;
  return offers
    .filter((offer) => (min === null || offer.finalPrice >= min) && (max === null || offer.finalPrice <= max))
    .sort((a, b) => a.finalPrice - b.finalPrice);
}, [offers, minPrice, maxPrice]);

const visibleOffers = useMemo(() => filteredOffers.slice(0, visibleCount), [filteredOffers, visibleCount]);
```

- [ ] **Step 5: Run checks**

```powershell
npm test
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib components tests
git commit -m "feat: add price filters and flavor cache"
```

## Task 6: Browser Verification

**Files:**
- No source changes unless verification finds an issue.

- [ ] **Step 1: Start dev server**

```powershell
npm run dev
```

Expected: Next.js dev server prints a localhost URL.

- [ ] **Step 2: Open the app**

Open the printed localhost URL in the in-app browser.

Expected without Naver credentials: error state explains missing `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`.

- [ ] **Step 3: Verify with credentials**

Set environment variables:

```powershell
$env:NAVER_CLIENT_ID='your-client-id'
$env:NAVER_CLIENT_SECRET='your-client-secret'
npm run dev
```

Expected:

- Query loads up to 100 current Naver Shopping offers.
- First 25 render.
- Scrolling loads the next 25.
- Row click opens the seller link in a new tab.
- Desktop shows left info and right price panel.
- Mobile stacks price panel below product info.

- [ ] **Step 4: Final commit if CSS fixes were needed**

```powershell
git add app components src tests
git commit -m "fix: polish offer list layout"
```

If no fixes were needed, skip this commit.

## References Checked

- Next.js App Router route handlers and client component rules: Context7 `/vercel/next.js`
- Naver Shopping Search API: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
