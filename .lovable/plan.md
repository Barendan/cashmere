

## Plan: Fix Monthly View to Aggregate by Month

### The Problem
"Monthly" shows every individual day in history instead of aggregating into monthly buckets. Combined with `interval={0}` forcing every label to render, the chart becomes unreadable.

### Changes

**File 1: `src/components/metrics/metricsUtils.ts`** (~10 LOC changed in 2 functions)

In both `calculateSalesDataFromTransactions` and `calculateItemsSoldData`, when `timeRange === "monthly"`, group by `YYYY-MM` instead of `YYYY-MM-DD`:

```typescript
// Instead of always using:
const dateStr = transactionDate.toISOString().split('T')[0];

// When timeRange === "monthly", use:
const dateStr = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
```

Format the month key as a readable label (e.g., "Jan 2025") for display.

**File 2: `src/components/metrics/MetricsBarChart.tsx`** (~1 LOC changed)

Change `interval={0}` to `interval="preserveStartEnd"` as a safety net so even large datasets don't overflow. This ensures labels are thinned automatically when there are too many bars.

### Summary

| | |
|---|---|
| **Files changed** | 2 |
| **LOC changed** | ~15 |
| **Risk** | Low — only affects how data is bucketed when "Monthly" is selected |

