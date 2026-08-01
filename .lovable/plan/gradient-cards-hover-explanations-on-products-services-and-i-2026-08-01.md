# Gradient Cards + Hover Explanations on Products, Services, and Inventory

Extend the exact treatment already shipped on the Traffic tab — a distinct soft gradient per card, tinted icon bubble, colored left edge, and a hover/tap explanation of how the number is calculated — to the Products tab, Services tab, and the Inventory page. No new colors invented, no logic or math changes.

## Shared foundation

- Reuse the existing `--traffic-1` … `--traffic-6` accent tokens in `index.css`. Rename nothing; they are already the on-brand spa palette (teal, water blue, leaf green, sand/gold, sage, stone).
- Add three more accent tokens only if a page needs a 7th–9th distinct color; Products and Services each need 3, Inventory needs 3, so the existing six are enough with deliberate reuse.
- Continue using `MetricsCard`'s `accent`, `subLine`, and `explanation` props — already built. No new component needed for the metrics tabs.
- For Inventory, add a small presentational wrapper so the three top cards there get the same accent gradient + hover-explanation behavior without forcing them into the `MetricsCard` value/icon shape.

## Products tab

Three top cards get accents and hover copy:

- **Today's Revenue** (accent 1) — "Total product sales rung up today, after discounts. Excludes services and tips."
- **Today's Profit** (accent 3) — "Revenue minus the cost price of each unit sold. Cost comes from the product's recorded cost."
- **Items Sold Today** (accent 4) — "Number of product units sold today, counting quantity, not tickets."

The section cards below (Sales Dashboard, Product Performance, Sales by Category, Product Profitability) get an info icon next to each title with a one-line explanation of what the chart or table shows, matching the Traffic tab treatment. Their card surfaces stay clean — gradients only on the top metric cards, so the charts stay readable.

## Services tab

Three top cards get accents and hover copy:

- **Today's Service Revenue** (accent 2) — "Total charged for services today, after discounts. Excludes retail products and tips."
- **Unique Customers Today** (accent 5) — "Different client names on today's service tickets. Tickets with no name can't be attributed."
- **Services Provided Today** (accent 6) — "Count of service line items performed today. One ticket can include several services."

Same info-icon treatment on the Services Revenue chart, Service Types breakdown, and Service Performance table titles.

## Inventory page

The three cards at the top (Total Inventory Value, Low Stock Threshold, Monthly Restock) currently share a flat white surface. They get:

- Distinct accent gradients (value = accent 1, threshold = accent 4, restock = accent 3) with a matching colored left edge and tinted icon bubble.
- Hover/tap explanations: how inventory value is computed (cost price x stock on hand, not sell price), what the threshold does (drives the low-stock badge on every product), and what the monthly restock records.
- The wide "Inventory Management" card currently uses hardcoded hex gradient values (`from-[#f5faf8] to-[#e5f4ed]/60`). Those get replaced with token-based gradient so it themes correctly and matches the new cards.

Layout, sorting, editing, and all inventory actions are untouched.

## Consistency and quality checks

- Cards keep equal heights and the current responsive grids (1 / 2 / 3 columns); gradients fade toward the card background so text contrast is unaffected.
- Every card that carries an explanation shows the small info icon so touch users can tap for the same content.
- No hardcoded color utilities anywhere — tokens only, so light and dark themes both hold.

## Technical notes

- `src/index.css`: reuse existing accent classes; replace the Inventory hardcoded hex gradient with a token gradient.
- `src/components/metrics/ProductMetrics.tsx`, `src/components/metrics/ServiceMetrics.tsx`: add `accent` + `explanation` props to the three cards each, plus title info icons on the section cards.
- `src/pages/Inventory.tsx`: apply accent classes and hover explanations to the three summary cards.
- Possibly one small shared piece: a tiny `InfoHint` component (icon + hover card) so the title explanations aren't duplicated in four files.
- No changes to metrics math, `metricsUtils.ts`, `taxUtils.ts`, `trafficUtils.ts`, DataContext, or the database.
