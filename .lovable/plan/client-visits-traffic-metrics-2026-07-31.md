# Client Visits & Traffic Metrics

## What exists today

- **Services tab** shows "Unique Customers Today" and "Services Provided Today" (with yesterday as comparison only) — computed from `serviceIncomes` customer names in `useMetricsCalculation.ts`.
- **Products tab** shows revenue / items sold per day, week, or month.
- **Tax tab** shows gross, exempt, taxable, tax due, refunds.

## What is missing

There is no view anywhere that answers "how many client visits / tickets did we have per day, week, or month". Specifically missing:

- Visit (checkout) counts over time — only today/yesterday customer counts exist.
- Unique clients per week / per month.
- New vs. returning clients.
- Average ticket value (revenue per visit) and items/services per visit.
- Any client-level list (who came, how often, how much they spent).

The good news: the data needed is already stored. Every checkout writes one `finance_transactions` row (customer name, payment, totals) and/or one `sales` row, and line items link back to it. So a "visit" = one checkout ticket, and it can be counted reliably without any database change.

## Plan: add a "Traffic" tab to Metrics

A fourth tab next to Products / Services / Tax, admin-only like the rest.

### Definitions used

- **Visit** = one checkout (one `finance_transactions` id, or a `sales` id when there is no finance transaction). Products + services rung up together = one visit.
- **Unique client** = distinct trimmed, case-insensitive customer name within the period. Blank names count toward visits but not toward unique clients (shown as "unnamed").
- **New client** = first-ever recorded visit falls inside the selected period.

### Contents

1. Summary cards for the selected period: Visits, Unique Clients, New Clients, Avg Ticket, Services per Visit, Products per Visit — each with the previous comparable period beside it.
2. Visits-over-time bar chart with Daily / Weekly / Monthly toggle (reuses the existing time-range control and EST day bucketing already used by the tax report).
3. Revenue-per-visit line on the same time buckets so busy days vs. profitable days are visible.
4. Top clients table: client, visits, last visit, total spent, services count, products count — sortable, with CSV export using the existing export hook.
5. Day-of-week / hour-of-day summary so peak times are visible for staffing.

### Technical notes

- New `src/components/metrics/trafficUtils.ts`: builds visit records by grouping `serviceIncomes` and product `transactions` on `financeTransactionId` / `saleId`, then aggregates per bucket and per client. Pure functions, no data fetching.
- New `src/components/metrics/TrafficMetrics.tsx`: presentation only, reusing `MetricsCard`, `MetricsBarChart`, `DataTable`.
- `src/pages/Metrics.tsx`: add the fourth tab and wire the existing `metricsCache` data in — no new queries, no schema changes, no RLS changes.
- Timezone: America/New_York bucketing, consistent with the tax report.
- Fully responsive (cards stack, tables scroll horizontally) to match the fixes already applied on the Tax tab.

### Known limitation to be honest about

Visits are only as accurate as the customer names entered at checkout. Tickets left blank count as visits but cannot be attributed to a client, and misspelled names will split one client into two. If you want stronger client tracking later, the next step would be a real `clients` table with a picker at checkout — that is a separate, larger change and is not part of this plan.
