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
- Scheduled GitHub Actions can refresh `data/latest-offers.json` for static/public display.
- Refreshed JSON is published to the `gh-pages` branch so `master` stays source-only.
- Local `data/*.json` changes are ignored unless intentionally force-added.

## Scheduled Refresh

`.github/workflows/refresh-offers.yml` refreshes the offer snapshot four times a day:

- 02:00 KST
- 10:00 KST
- 14:00 KST
- 18:00 KST

It can also be run manually from GitHub Actions.

## Shipping Fees

Shipping fees are shown when they can be inferred or collected. Unknown shipping remains marked as needing seller confirmation.

## GitHub Notes

This repository can be pushed to GitHub as source code. GitHub Pages can host a static build that reads committed JSON snapshots, but it cannot run the Next.js API route. Use a server or container runtime only if live on-demand collection is required.
