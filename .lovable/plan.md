

## Fix: Backfill Missing Dates with Zero-Value Bars

### Problem
Both `calculateSalesDataFromTransactions` and `calculateItemsSoldData` in `metricsUtils.ts` only create bars for dates that have transactions. Days with no sales are omitted entirely, making a 7-day chart show only 2 bars instead of 7.

### Solution
After aggregating transactions into the `salesByDate` / `soldByDate` maps, generate all dates in the selected range and fill in any missing ones with `revenue: 0`.

### Changes

**File: `src/components/metrics/metricsUtils.ts`** (~20 LOC added)

Add a helper function to generate all dates between two endpoints:

```typescript
function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
```

In both `calculateSalesDataFromTransactions` and `calculateItemsSoldData`, after building the map from transactions, backfill missing dates:

- For `"7days"`: generate all dates from `sevenDaysAgo` to today
- For `"30days"`: generate all dates from `thirtyDaysAgo` to today
- For `"monthly"`: generate all months from the earliest transaction month to the current month
- For each missing date key, insert `{ date: dateStr, revenue: 0 }`
- Return entries sorted by the full date range, not just existing keys

This ensures every day/month in the range gets a bar, with zero-value bars for days without sales.

### Summary

| | |
|---|---|
| **Files changed** | 1 (`metricsUtils.ts`) |
| **LOC changed** | ~25 (helper + backfill logic in 2 functions) |
| **Risk** | Low — only adds missing zero entries, existing data untouched |

