
Goal: Fix Product Profitability so it is full-width + truly scrollable, show all products (not only sold ones), and add a new monthly Product Sales export from the Sales Dashboard.

Why prior attempts failed (from current code):
1) Width was reduced by `max-w-[80%]` on the Product Profitability card.
2) `DataTable` uses a Radix `ScrollArea` + split header/body tables; with current structure (`Viewport` with `h-full` and only `maxHeight` set), vertical overflow does not reliably become the scroll container.
3) Table rows are built from `productPerformance`, which currently only includes products that have at least one sale transaction (DB has more total products than sold products), so “all products” is not shown.

Implementation plan (new approach, not the previous one):
1) Restore Product Profitability width
- Remove `max-w-[80%]` from the Product Profitability card in `ProductMetrics.tsx`.
- Keep full-width layout as before.

2) Rebuild table scrolling with native overflow (replace current ScrollArea pattern)
- Refactor `src/components/metrics/DataTable.tsx` to:
  - use one single table (header + body together),
  - wrap it in a native container: `overflow-y-auto` (or `overflow-y-scroll`) + `overflow-x-auto`,
  - apply `maxHeight` directly to that wrapper,
  - keep sticky header inside this same scroll container.
- This removes the fragile two-table + Radix setup and gives deterministic scrolling.

3) Ensure Product Profitability includes every product
- Update `calculateProductPerformance` in `src/components/metrics/metricsUtils.ts`:
  - initialize metrics rows for all sellable products with zero values,
  - then accumulate sale transactions into those rows.
- Result: table shows all product rows and details, including unsold products (0 sold / $0 revenue / $0 profit).

4) Add monthly Product Sales export in Sales Dashboard
- In `ProductMetrics.tsx`, add a dedicated export action in the Sales Dashboard header (separate from the profitability export).
- Create helper(s) in `metricsUtils.ts` to build “all-time monthly product sales” CSV from `transactions`:
  - filter `type === "sale"`,
  - group by month (same month-style label used in charts),
  - include all payment methods by not filtering payment type,
  - aggregate totals (at minimum monthly revenue; also include items sold count for usefulness).
- Download filename format: `spa-product-sales-monthly-YYYY-MM-DD.csv`.

Technical details:
- Files to update:
  - `src/components/metrics/DataTable.tsx` (core scroll fix)
  - `src/components/metrics/ProductMetrics.tsx` (width restore + new Sales Dashboard export button/handler)
  - `src/components/metrics/metricsUtils.ts` (all-products performance + monthly sales CSV aggregation)
- No DB schema or Supabase policy changes required.
- Fetching is already paginated for metrics; the main blocker is rendering/aggregation logic, not missing backend pages.

Acceptance checks:
1) Product Profitability card is full width again.
2) Vertical scrollbar is visible/usable in Product Profitability and scrolls through all rows.
3) Table includes all products (including unsold with zero metrics).
4) New Sales Dashboard export downloads monthly product-sales CSV from earliest month to current month.
5) Export includes all product sales regardless of payment method.
