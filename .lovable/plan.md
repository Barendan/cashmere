

## Layout Restructure: Split Charts Side-by-Side + Recent Sales Activity

### What changes

**File: `src/components/metrics/ProductMetrics.tsx`**

Currently the "Product Sales Overview" card contains both charts stacked vertically. The new layout:

1. **Split into a 2-column grid row** after the 3 metrics cards:
   - **Left column**: Card with "Product Sales Overview" chart + a "Recent Sales" scrollable list below the chart (same card)
   - **Right column**: Card with "Product Items Sold Over Time" chart

2. **Recent Sales list** (inside the left card, below the revenue chart):
   - Scrollable container with `max-h-[250px] overflow-y-auto`
   - Shows transactions from the `sales` prop (which contains `items` arrays), sorted newest first
   - Each row: product name, quantity, price, and relative timestamp (e.g., "2 hours ago")
   - Most recent sale at the top

### Implementation details

- Extract recent product transactions from `salesTransactions` (already filtered for `type='sale'` and `forSale`) — but `ProductMetrics` currently receives `sales: Sale[]` which has `items: Transaction[]`. We'll flatten sale items, sort by date descending, and take the last ~20.
- The time range filter buttons stay on the left card's header (they control the revenue chart).
- Remove the `<Separator>` and the "Items Sold" section from the left card; move it to its own card on the right.
- Both cards share a `grid grid-cols-1 lg:grid-cols-2 gap-6` row.

### Structure sketch

```text
┌─────────────────────────────────┬──────────────────────────────────┐
│ Product Sales Overview          │ Product Items Sold Over Time     │
│ [7d] [30d] [Monthly]           │                                  │
│ ┌─────────────────────────────┐│ ┌──────────────────────────────┐ │
│ │  Revenue Bar Chart (300px)  ││ │  Items Sold Bar Chart (300px)│ │
│ └─────────────────────────────┘│ └──────────────────────────────┘ │
│                                │                                  │
│ Recent Sales Activity          │                                  │
│ ┌─────────────────────────────┐│                                  │
│ │ Product A  x2  $50  2h ago ││                                  │
│ │ Product B  x1  $25  5h ago ││                                  │
│ │ (scrollable, max-h-250px)  ││                                  │
│ └─────────────────────────────┘│                                  │
└─────────────────────────────────┴──────────────────────────────────┘
```

### Files changed

| File | Change |
|------|--------|
| `src/components/metrics/ProductMetrics.tsx` | Split the combined card into 2-column grid; add Recent Sales list in left card |

~40 LOC added, ~15 LOC restructured. No new files or dependencies needed — uses existing `Sale`/`Transaction` types and `formatCurrency`/`formatDateEST` from `format.ts`.

