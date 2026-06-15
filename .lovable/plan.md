## Goal

Add a "Quarterly Tax Report" section to the Metrics page that gives you the numbers needed for sales-tax filing: gross sales, exempt sales, taxable sales, tax due, plus a full product/service/payment-method breakdown — all without changing the database.

## Ground rules (per your answers)

- **No DB changes.** All tax logic lives in the frontend.
- **Defaults**: products = taxable, services = exempt.
- **Tax rate**: editable in the UI, persisted in `localStorage` (no DB). Empty until you enter it; tax-due cells show "—" until set.
- **Per-item overrides**: a small UI lets you mark specific products as exempt or specific services as taxable. Overrides stored as a list of IDs in `localStorage` (keys: `tax.exemptProductIds`, `tax.taxableServiceIds`, `tax.rate`). No schema change.
- **EST bucketing** (`America/New_York`) reused from the existing monthly export so totals reconcile with your CSV.

## What gets added

### 1. New component: `src/components/metrics/TaxReport.tsx`

A card placed on the Metrics → Products tab, below Cash Overview.

Header controls:
- **Year** dropdown (auto-populated from earliest transaction year → current year, EST)
- **Quarter** selector: Q1 (Jan–Mar) / Q2 (Apr–Jun) / Q3 (Jul–Sep) / Q4 (Oct–Dec), defaults to current quarter
- **Tax rate** input (e.g. `8.875`), with a small "Save" — persists to `localStorage`
- **Manage taxability** button → opens a dialog listing all products and services with a taxable/exempt toggle each; saves the override lists to `localStorage`
- **Export Quarterly CSV** button

Top tiles (selected quarter, EST):
- Gross Sales (products + services, sum of line prices before discount)
- Discounts (sum of `finance_transactions.discount` in range)
- Net Sales (Gross − Discounts)
- Exempt Sales
- Taxable Sales
- Tax Due (Taxable × rate, or "—" if no rate)
- Tips (informational; from `finance_transactions.tip_amount`)

Breakdown table:
- Rows: Products, Services, **Total**
- Columns: Gross, Exempt, Taxable, Tax Due

Payment-method table (gross totals from `sales.payment_method` + service incomes):
- Cash, Card, Other

Monthly sub-totals (3 rows for the quarter's months) with the same columns as the breakdown table — for cross-checking bookkeeping.

CSV export (`Tax_Report_{Year}_Q{n}.csv`):
- One row per month + a quarter total row
- Columns: Month, Gross, Discounts, Net, Exempt, Taxable, Tax Due, Tips, Cash, Card, Other

### 2. New helper: `src/components/metrics/taxUtils.ts`

Pure functions, fully unit-testable, all EST-aware (`Intl.DateTimeFormat` with `America/New_York`, same pattern as the existing `toESTMonthKey`):

- `getQuarterRange(year, quarter)` → returns `{ startMs, endMs }` covering the EST quarter bounds.
- `isProductTaxable(productId, exemptIds)` → default `true` unless in `exemptIds`.
- `isServiceTaxable(serviceId, taxableIds)` → default `false` unless in `taxableIds`.
- `computeTaxReport({ transactions, serviceIncomes, financeTransactions, sales, products, services, year, quarter, rate, exemptProductIds, taxableServiceIds })` → returns:
  ```
  {
    totals: { gross, discounts, net, exempt, taxable, taxDue, tips },
    byCategory: { products: {...}, services: {...} },
    byPaymentMethod: { cash, card, other },
    byMonth: [ { monthLabel, gross, exempt, taxable, taxDue, ... }, x3 ]
  }
  ```
- `generateTaxReportCsv(report, year, quarter)` → triggers the download.

Source data:
- **Product sales** → from `transactions` where `type = 'sale'` (already loaded in `metricsCache.transactions`). Uses `productId` to look up taxability.
- **Service sales** → from `serviceIncomes` parsed via the existing `ParsedServiceCategory` JSON (mirrors `calculateServicesData`), applying per-line discount allocation so net stays consistent with current dashboard math. Uses each line's `serviceId` for taxability.
- **Discounts** → sum `finance_transactions.discount` in range (already exposed on `metricsCache`; if not, pull alongside other metrics in `fetchAllMetricsData`).
- **Tips** → sum `finance_transactions.tip_amount` in range.
- **Payment methods** → group `sales.totalAmount` by `sales.payment_method`, plus service incomes by their payment method.

### 3. `Manage Taxability` dialog: `src/components/metrics/TaxabilityManager.tsx`

Simple two-tab dialog (Products / Services). Each row: name + a Switch. "Save" writes the two ID lists to `localStorage` and closes. No DB writes.

### 4. Wiring

- `src/pages/Metrics.tsx`: render `<TaxReport ... />` inside the Products view, below `<ProductMetrics ... />`. Pass `products`, `services`, `transactions`, `serviceIncomes`, plus `financeTransactions` and `sales` from `metricsCache`.
- `src/contexts/DataContext.tsx` / `fetchAllMetricsData`: confirm `financeTransactions` is included in `metricsCache`; if not, add it to the same fetch (it's needed for discounts + tips). This is the only data-layer touch.

## Files changed

| File | Change |
|---|---|
| `src/components/metrics/TaxReport.tsx` | NEW — main report card UI |
| `src/components/metrics/TaxabilityManager.tsx` | NEW — taxability override dialog |
| `src/components/metrics/taxUtils.ts` | NEW — pure tax math + EST bucketing + CSV |
| `src/pages/Metrics.tsx` | Mount `<TaxReport />` under Products |
| `src/contexts/DataContext.tsx` | (Only if needed) include `financeTransactions` in `metricsCache` |

No DB migrations. No schema changes. No changes to existing charts or exports.

## Acceptance checks

1. Selecting Year + Quarter on the Tax Report renders gross / exempt / taxable / tax-due tiles for that EST quarter.
2. Setting the rate and clicking save persists across reloads (`localStorage`).
3. Default behavior: every product counts as taxable; every service counts as exempt.
4. Flipping a product to exempt (or a service to taxable) in the manager immediately changes the totals.
5. Monthly rows sum exactly to the quarter total.
6. CSV export downloads with months + quarter total, all required columns.
7. Existing Sales Dashboard, monthly export, and cash overview totals are unchanged.

## What's intentionally NOT in scope

- No DB columns, no migrations, no tax snapshots on past sales.
- No multi-rate support (single flat rate). Easy to extend later if needed.
- No automatic state-by-state nexus logic; this is a single-jurisdiction report.