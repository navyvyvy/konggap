# Green Bean Price Finder Design

## Goal

Build a green coffee bean price comparison tool for home roasters. The app lists currently purchasable green bean offers, shows the current final cost clearly, and sends the user to the seller page when they select an item.

This is not a shop, review service, price tracker, or AI recommendation product.

## MVP Scope

Include:

- Query-time crawling/search for purchasable green bean offers
- Offer-level list, not bean-level grouping
- Final cost first
- Product price and shipping fee
- Flavor tags, roast tags, and a short compact taste note when available
- Price range filter based on final cost
- Manual min/max price filter
- Weight filter if weight can be parsed
- Sorting by final cost
- Infinite scroll over fetched results
- Data timestamp such as `2026.06.26 21:00 기준`
- Footer link to the existing external roasting timer

Exclude:

- Product detail pages
- In-app shopping
- User accounts
- Favorites and saved lists
- Periodic crawling
- Price history
- Price alerts
- Sold-out handling
- Whole bean comparison
- Bean-level grouping by seller
- Swipe actions
- 1kg normalized price in the initial UI

## Source Priority

Use Naver Shopping and Coupang first because the first product value is current price comparison.

Specialty green bean shops are second priority. Use them to enrich flavor, origin, process, roast, and description data when needed.

Do not require the official Naver Shopping API for the MVP. Use the `insane-search` workflow for query-time crawling/search access, especially for Naver, Coupang, and protected shop pages. Search queries must target green beans explicitly, for example `생두`, `커피 생두`, or a user query suffixed with `생두` when the user did not already specify it.

Validation note from the planning session: the `insane-search` curl grid reached Naver search but got a soft-captcha verdict. The Playwright browser path rendered the Naver `생두` search page and showed shopping sections. The crawler should therefore support the full `insane-search` escalation path, not only plain HTTP fetch.

## Data Flow

```text
user query
→ loading state
→ fetch up to 100 current purchasable green bean offers
→ parse raw offer data
→ normalizeProduct(raw)
→ render first 25 offers
→ load 25 more by infinite scroll
```

The app shows current query-time data only. It does not run background jobs or track price changes.

## Offer Model

The list item represents a seller offer, not a unique bean.

Core normalized fields:

```ts
id
name
seller
source
sourceUrl
price
shippingFee
finalPrice
weightGram
flavorTags
roastTags
tasteNote
rawDescription
fetchedAt
```

Derived:

```ts
finalPrice = price + shippingFee
```

Do not show `pricePer1kg` in the MVP UI. It can exist later if weight parsing and value sorting become reliable.

## Flavor Cache

Cache only stable descriptive data. Do not cache prices, shipping fees, links, or availability.

Cacheable:

- flavor tags
- roast tags
- compact taste note
- raw description excerpt
- last analyzed time

Cache key should be conservative. Do not reuse flavor data for vague matches like `Yirgacheffe` alone.

Initial key:

```text
normalizedName + grade + process
```

Use more fields when available:

```text
originCountry + region + farm + variety + harvestYear
```

Rules:

- `G1` and `G2` are different cache candidates.
- `natural` and `washed` are different cache candidates.
- Different farm or harvest year should not blindly reuse cached notes.
- If the match is uncertain, leave tags empty rather than inventing confidence.

## List UI

Use a compressed list. The whole row is the external seller link.

No visible `구매처 열기` button. No `정보 보기` button. No hover underline or hover background decoration. Pointer cursor is enough.

Desktop row:

- Left: crawled product title, flavor tags, roast tags, compact taste note
- Right: final cost, product price, shipping fee with truck icon

Mobile row:

- Product title
- Tags
- Compact taste note
- Separated price block below the product info

The crawled title should contain details like weight where the source provides them, for example `에티오피아 예가체프 G1 내추럴 생두 2kg`.

Spacing should be dense. The current preview is directional, not final visual polish.

## Filters And Sorting

MVP filters:

- final cost preset range
- manual min/max final cost
- weight, if parsed
- flavor tag
- roast tag

MVP sorting:

- final cost low to high

Possible later sorting:

- product price low to high
- shipping fee
- weight
- seller/source
- freshness of fetched result

## States

Use only these MVP states:

- Loading: query is fetching current data
- Empty: no purchasable green bean offers match the query/filter
- Error: query failed
- List: offers are available

No sold-out state. Sold-out products should not enter the list.

## Responsive Rules

Numbers and units must not break awkwardly. `28,000원`, `상품가 25,000원`, and `배송비 3,000원` stay as meaningful chunks.

Tags wrap by whole tag. Do not split tag text across lines.

Desktop and mobile use the same component with responsive layout, not separate product behavior.

## Implementation Order

1. Build query-time crawling with a small `insane-search` source adapter.
2. Parse current offer fields: title, price, shipping, link, seller, source, possible weight.
3. Normalize offers and calculate final cost.
4. Render dense responsive list.
5. Add filters and final-cost sorting.
6. Add loading, empty, and error states.
7. Add flavor/roast cache for stable descriptive data.
8. Add AI-assisted tag/note extraction only in the data preparation path, not as an in-app recommender.
