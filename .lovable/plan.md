# Traffic Tab: Colored Metric Cards, Hover Explanations, Clearer Numbers

Scope is only the Traffic tab of Business Metrics. No database changes.

## 1. Six distinct gradient cards

Each of the six top cards gets its own color, applied as a soft gradient that fades out toward the bottom-right so the text stays fully readable.

- Add six accent tokens to `index.css` (HSL variables + matching `--gradient-traffic-*` fade-to-transparent gradients), drawn from the existing spa palette so it stays on-brand: teal (Visits), water blue (Unique Clients), leaf green (New Clients), warm sand/gold (Avg Ticket), sage (Services per Visit), stone (Products per Visit).
- Extend `MetricsCard` with an optional `accent` prop that applies the gradient background, a tinted icon bubble, and a matching left edge. No hardcoded color classes — tokens only.
- Cards keep the current responsive grid (1 / 2 / 3 columns) and equal heights.

## 2. Hover explanations

- Each card becomes a hover/focus target (shadcn `HoverCard`, with a small info icon in the corner so touch users can tap it too).
- Content per card: one plain-English sentence on what it means, one line on exactly how it is computed, and the caveat if there is one. Draft copy:
  - **Visits** — "How many checkout tickets were rung up. Services and products paid together count as one visit."
  - **Unique Clients** — "How many different client names appear on those tickets. Tickets with no name are excluded (they still count as visits)."
  - **New Clients** — "Clients whose very first recorded visit falls in this period. Based on the visit history stored in the app."
  - **Avg Ticket** — "Total sales in the period divided by the number of visits. Amounts are after discounts and exclude tips."
  - **Services per Visit** — "Number of services performed divided by visits."
  - **Products per Visit** — "Number of product units sold divided by visits."
- Same treatment reused for the chart card titles (Visits, Revenue per Visit, Busiest Days/Hours) so the whole tab is self-explanatory.

## 3. Making the numbers make sense

Changes to how the six figures are presented and computed:

1. **Show the raw counts, not just ratios.** "Services per Visit 0.8" reads like a bug. Replace those two cards with **Services performed** and **Products sold** as whole numbers, with the per-visit average as the small secondary line ("0.8 per visit"). Same information, no confusing headline.
2. **Split the visit count.** Under Visits, show the mix: "4 service tickets · 2 product-only tickets". This immediately explains why services per visit is below 1 — product-only tickets have zero services.
3. **Exclude tip-only tickets from visit counts.** Standalone tips are recorded against a $0 "Tip" placeholder service, so today they inflate visits and drag every per-visit average down. They will be filtered out of visits and counted separately in a small footnote.
4. **Fix New Clients.** Today a client counts as new if their first visit is at or after the *earliest visit inside the period* — not the actual start of the day/week/month. It will be changed to the real period boundary. The card copy will also state plainly that "new" means new relative to recorded history, so 4 unique / 1 new simply means 3 of those clients had visited before.
5. **Unnamed tickets surfaced next to Unique Clients** rather than only in the client table caption, so the gap between visits and unique clients is never a mystery.

## 4. About your numbers — honest read

I queried the live data for today (EST) before writing this:

- `finance_transactions`: 2 service tickets (Laquita Evans $180 fresha, Mailin YI $95 cash).
- `sales`: 1 product ticket ($100 card, 1 unit).

That is **3 visits and 2 named clients today**, not 6 visits / 4 unique clients. So the tab is showing roughly double what the database holds for today. The ratios you saw (0.8 and 0.2) correspond to 5 services and 1 product unit over 6 visits, which also does not match the 2 service line items on record.

I will not guess at the cause; the most likely candidates are the two-minute mixed-sale merge window matching wrongly, or the cached metrics data covering rows the current-day filter is also counting from a different day boundary. **Step one of the build will be to instrument `buildVisits` against the real data and confirm the exact source of the duplication before any cosmetic work ships** — the visuals are pointless if the count is wrong. I will report what the duplication actually was.

## Technical notes

- `src/index.css`: six accent + gradient tokens.
- `src/components/metrics/MetricsCard.tsx`: `accent`, `tooltip`, and `subLine` props; hover card wrapper.
- `src/components/metrics/trafficUtils.ts`: period-boundary keys for new-client detection, tip-only ticket filtering, service/product ticket split counts, plus a debug reconciliation pass to find the visit over-count.
- `src/components/metrics/TrafficMetrics.tsx`: card copy, accents, restructured Services/Products cards.
- No schema, RLS, or checkout logic changes; Traffic stays admin-only.
