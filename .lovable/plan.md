

## Analysis

### Existing reusable code
`formatDateEST` in `src/lib/format.ts` exists but returns display strings like `"Mar 14, 2025"` — not `YYYY-MM-DD` keys suitable for grouping. There is **no existing local-date-key helper** to reuse. We need to create one.

### Where the timezone bug exists
**All in one file: `src/components/metrics/metricsUtils.ts`** — 7 occurrences of `toISOString().split('T')[0]`:

| Line | Function | Affects |
|------|----------|---------|
| 112 | `generateDateRange` | Backfill date keys (Products charts) |
| 156 | `calculateSalesDataFromTransactions` | Product revenue grouping |
| 215 | `calculateItemsSoldData` | Items sold grouping |
| 280 | `calculateSalesData` | Legacy sales-based calc |
| 716 | `calculateDailyCashIncome` (range gen) | Cash daily chart |
| 729 | `calculateDailyCashIncome` (sale bucketing) | Cash daily chart |
| 746 | `calculateDailyCashIncome` (service bucketing) | Cash daily chart |

**Pages affected:**
- `/metrics` — Products tab (revenue + items sold charts) and Cash Overview (daily chart) — all broken the same way
- No other pages use date-key grouping

### Plan

**File: `src/components/metrics/metricsUtils.ts`** (~10 LOC)

1. Add one helper at the top:
```typescript
const toLocalDateKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
```

2. Replace all 7 instances of `.toISOString().split('T')[0]` with `toLocalDateKey(...)` — same variable, just swap the method call.

No other files need changes. One helper, 7 replacements, all in one file.

