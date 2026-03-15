

## Plan: Add Products Sold Per Week/Month View

### What We're Building
A new "Items Sold" bar chart in Product Metrics that shows total quantity of products sold over time, with the same 7-day / 30-day / monthly toggle that the revenue chart already uses. This reuses existing patterns exactly.

### Why It's Minimal
- The data (`salesTransactions` with `quantity`) is already fetched and available
- The chart component (`MetricsBarChart`) already exists
- The time range toggle already exists and is shared
- We just need one new calculation function and one new chart card

### Changes

**File 1: `src/components/metrics/metricsUtils.ts`** (~20 LOC added)

Add a new function `calculateItemsSoldData` — a near-copy of `calculateSalesDataFromTransactions` but summing `quantity` instead of `price`:

```typescript
export const calculateItemsSoldData = (
  salesTransactions: Transaction[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, thirtyDaysAgo: Date }
): SalesDataPoint[] => {
  // Same date filtering as calculateSalesDataFromTransactions
  // Group by date, sum transaction.quantity instead of transaction.price
  // Return as { date, revenue: totalQuantity } (reusing SalesDataPoint shape)
};
```

**File 2: `src/hooks/useMetricsCalculation.ts`** (~6 LOC added)

Add a new `useMemo` call inside `useProductMetricsCalculation` that calls `calculateItemsSoldData`, and return it alongside existing values:

```typescript
const itemsSoldData = useMemo(() => {
  return metricsUtils.calculateItemsSoldData(salesTransactions, timeRange, { sevenDaysAgo, thirtyDaysAgo });
}, [salesTransactions, timeRange, sevenDaysAgo, thirtyDaysAgo]);
```

**File 3: `src/pages/Metrics.tsx`** (~2 LOC changed)

Destructure `itemsSoldData` from `useProductMetricsCalculation` and pass it to `ProductMetrics`.

**File 4: `src/components/metrics/ProductMetrics.tsx`** (~25 LOC added)

Add the prop and render a new `Card` with `MetricsBarChart` directly below the existing "Sales Overview" chart:

```text
┌─────────────────────────────────────┐
│  Items Sold Over Time               │
│  (uses same timeRange toggle)       │
│  ┌─────────────────────────────────┐│
│  │  Bar chart: quantity by date    ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

The chart uses the existing `MetricsBarChart` with `tooltipType` set to a plain number (not currency) and a distinct bar color.

### Summary

| | |
|---|---|
| **Files changed** | 4 |
| **LOC added** | ~53 |
| **LOC modified** | ~4 |
| **New dependencies** | None |
| **Risk** | Very low — additive only, no existing behavior changes |

