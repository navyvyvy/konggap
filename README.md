# Green Bean Price Finder

Home roaster green coffee bean price comparison tool.

The app shows current purchasable green bean offers with final cost first, then seller, shipping fee, flavor/process tags, and roast hints when available. It is a comparison aid, not a shop, recommender, price tracker, or alert service.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Data Behavior

- The first page load requests `/api/offers?q=생두`.
- Same-query results are cached for 30 minutes.
- If `data/latest-offers.json` exists and is still fresh, refreshes reuse it before collecting a new list.
- Pressing `조회` sends `refresh=1` and intentionally collects a fresh list.
- `data/*.json` is ignored by git. These files are local runtime snapshots, not source files.

## Current Sources

- Naver search/shopping results
- Coffee Libre
- Momos Coffee
- Coffee Plant / 생두몰
- Coffee CG / 커피창고
- CoffeeSys
- Rehm Coffee
- Alma Cielo
- Sopex Korea

Coupang is intentionally excluded because access was consistently denied during testing.

## Shipping Fees

Confirmed default shipping rules are applied only where we have a usable rule:

- Coffee Libre: 0 KRW
- Momos Coffee: 2,500 KRW, free from 40,000 KRW
- Coffee CG / 커피창고: 3,000 KRW, free from 70,000 KRW
- Coffee Plant / 생두몰: 4,000 KRW, free from 50,000 KRW
- CoffeeSys: 3,000 KRW, free from 50,000 KRW

Unknown shipping remains marked as needing seller confirmation.

## GitHub Notes

This repository can be pushed to GitHub as source code. GitHub Pages is not enough to run the app because the Next.js API route uses Playwright-backed server-side collection. Use a server or container runtime when exposing it publicly.
