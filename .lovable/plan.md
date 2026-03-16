

## Fix Monthly Product Sales Export — Accuracy & Timezone

### Problem Analysis

I queried the database directly using `AT TIME ZONE 'America/New_York'` and got the ground-truth monthly totals. Comparing against what the current export code produces reveals the core issue:

**The export uses browser-local `getMonth()`/`getFullYear()`** to bucket transactions into months. Since `transaction.date` is stored as UTC in Supabase, any transaction occurring between midnight UTC and 4/5 AM UTC (which is still the previous day in EST) gets assigned to the wrong month — particularly problematic at month boundaries (e.g., a June 30 11pm EST sale stored as July 1 UTC gets counted in July instead of June).

Your data goes back to May 2025 (11 months), so the "only past year" observation is actually your full dataset. The inaccurate numbers on earlier months are from this timezone bucketing error.

### Plan

**File: `src/components/metrics/metricsUtils.ts`**

Rewrite `generateMonthlyProductSalesCsv` to:

1. **Convert each transaction date to EST before bucketing** — create a helper that formats a UTC date into EST year/month using `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`:
   ```typescript
   const toEST = (d: Date) => {
     const parts = new Intl.DateTimeFormat('en-US', {
       timeZone: 'America/New_York',
       year: 'numeric',
       month: '2-digit'
     }).formatToParts(d);
     const year = parts.find(p => p.type === 'year')!.value;
     const month = parts.find(p => p.type === 'month')!.value;
     return `${year}-${month}`;
   };
   ```

2. **Use this EST key for grouping** instead of `d.getFullYear()-${d.getMonth()+1}`.

3. **Use EST-aware month labels** — derive the display label from the key rather than from `toLocaleString('default', ...)` which uses browser locale.

4. **Generate all months from earliest to current** — use `generateMonthRange` with EST-aware start/end to ensure no months are skipped (backfill zeros).

5. **Add per-product breakdown columns** — currently the CSV only has `Month, Items Sold, Revenue`. Add `Product Name` as a column so each row is a product-month combination, giving full detail. Alternatively keep the summary format but ensure the totals match the DB exactly. (I'll keep the summary format to match what's currently expected, but ensure accuracy.)

**No other files need changes.** The export button already calls `exportMonthlyProductSales(transactions)` correctly, and all transactions are already fetched via paginated loading.

### Verification

The DB ground truth (EST) is:
- May 2025: 19 items, $880.00
- Jun 2025: 100 items, $5,995.00
- Jul 2025: 57 items, $2,950.00
- (and so on through Mar 2026)

After the fix, the exported CSV must match these exact numbers.

### Summary of changes

| File | Change |
|------|--------|
| `src/components/metrics/metricsUtils.ts` | Rewrite `generateMonthlyProductSalesCsv` to use EST timezone for month bucketing via `Intl.DateTimeFormat`, backfill all months from earliest to current |

