## Final Tax Tab Fix Plan — only what actually matters

After re-auditing the writers (`recordBulkSale`, `recordServiceSale`) and the schema, most of the "issues" from the earlier audit turned out to be non-issues. Products and services live in fully disjoint tables, and product transactions are already written discount-netted. Only **two** real bugs remain, and both are fixed in one file.

---

### Fix 1 — Stop double-deducting service discounts (Severity 10)
**Problem:** `DataContext` already stores `serviceIncomes[].amount` as net-of-discount. Then `computeTaxReport` subtracts the discount *again* from `servicesBucket.taxable`/`exempt`. Tax Due on services is materially under-reported.

**Fix:** Delete the discount-allocation block in `taxUtils.computeTaxReport` (the `if (agg.discount > 0 && agg.gross > 0) { ... }` branch). Keep tracking `agg.discount` for the "Discounts" tile only.

**Cost:** ~10 lines removed in `src/components/metrics/taxUtils.ts`.

---

### Fix 2 — Net returns into the headline filing numbers (Severity 8)
**Problem:** Returns are computed but never subtracted from `totals.gross`, `totals.taxable`, `totals.taxDue`, or the monthly rows. The DR-15 expects net-of-refund figures.

**Fix:** In `computeTaxReport`, after computing the returns summary:
- Subtract `returnsTaxable` from `productsBucket.taxable` and the matching month rows (by `monthKey`).
- Subtract `returnsExempt` from `productsBucket.exempt` and matching months.
- Subtract `returnsTaxable + returnsExempt` from `productsBucket.gross` and month `gross`.
- Re-derive `taxDue` from the adjusted `taxable` (already done at the end of the function — just runs against the netted numbers).

In `TaxReport.tsx`, add a one-line caption under the "Sales" and "Tax Due" tiles: *"Net of refunds — see Returns & Refunds below."* The existing Returns card stays as the audit trail.

**Cost:** ~12 lines added in `taxUtils.ts`, ~2 lines in `TaxReport.tsx`.

---

### Fix 3 — Label cleanup (Severity 5, cosmetic but prevents misreading)
**Problem:** "Gross Sales" tile is actually net-of-discount (both products and services store discount-netted amounts). The separate "Net" tile then subtracts discounts a second time visually.

**Fix:** In `TaxReport.tsx`:
- Rename `"Gross Sales"` → `"Sales (after discounts)"`.
- Remove the redundant `"Net"` tile.
- Keep `"Discounts"` tile as informational.
- Add caption under Tax Due: *"Calculated on discount-adjusted, refund-netted sales per FL DR-15."*

**Cost:** ~6 lines changed in `src/components/metrics/TaxReport.tsx`.

---

### Explicitly NOT doing (and why)

| Earlier suggestion | Why we're skipping |
|---|---|
| Add `sales.discount` column | Product discounts are already baked into `transactions.price` at write time. No DB change needed. |
| Back-link `sales.finance_transaction_id` | Same reason — no cross-table allocation required. |
| Audit `payTotals` for double-counting | Products/services live in disjoint tables (`transactions`+`sales` vs `finances`+`finance_transactions`). No overlap possible. |
| Use `original_total` to show pre-discount "Gross" | Adds tiles, not filing-relevant. DR-15 wants discount-adjusted. |
| Move taxability flags from localStorage to DB | Only worth it if multiple admins manage flags or you need an audit trail. Defer until asked. |
| Florida $5,000 surtax cap | Not relevant at current ticket sizes. |
| Service-refund mechanism | No data path exists today; needs a product decision before any code (see question below). |

---

### Totals
- **Files touched:** 2 (`taxUtils.ts`, `TaxReport.tsx`)
- **Net lines changed:** ~30
- **DB migrations:** 0
- **New dependencies:** 0

### One open question before I build
Do service refunds happen today? If yes, how are they recorded — a negative `finances` row, a `type='refund'` row, or not at all? That determines whether we add a tiny reader branch for service refunds or punt entirely.
