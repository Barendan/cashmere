

## Fix: Recent Product Sales + Layout Restructure

### 1. Why Recent Sales Shows Nothing

`fetchSales()` returns rows from the `sales` table only — it never joins or attaches `items`. So `sale.items` is always `undefined`, and `flatMap(sale => sale.items || [])` returns an empty array every time.

**Best approach**: Use the `transactions` array directly (already fetched for metrics). Filter for `type === 'sale'`, sort by date descending. This is the most reliable source — each transaction row already has `productName`, `quantity`, `price`, and `date`. No extra DB queries needed.

### 2. Changes to `ProductMetrics.tsx`

**Data**: Add `transactions: Transaction[]` to the props interface. In the recent sales section, replace the `sales.flatMap(sale => sale.items...)` logic with:
```typescript
const recentItems = transactions
  .filter(t => t.type === 'sale')
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 30);
```

**Layout**: Wrap both charts and the recent sales list in one outer Card container:

```text
┌──────────────────────────────────────────────────────────────┐
│  Outer Card (border, rounded, shadow)                        │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │ Product Sales Overview  │  │ Items Sold Over Time       │ │
│  │ [7D] [30D] [Monthly]   │  │                            │ │
│  │ ┌─────────────────────┐ │  │ ┌────────────────────────┐ │ │
│  │ │ Revenue Bar Chart   │ │  │ │ Items Sold Bar Chart   │ │ │
│  │ └─────────────────────┘ │  │ └────────────────────────┘ │ │
│  │  bg-muted/50 rounded   │  │  bg-muted/50 rounded       │ │
│  └─────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│  ── Separator ──────────────────────────────────────────── │
│                                                              │
│  Recent Product Sales                                        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Product A  ×2  $50.00  2h ago                           ││
│  │ Product B  ×1  $25.00  5h ago                           ││
│  │ (scrollable, max-h-[250px])                             ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

- One outer `Card` wraps everything
- Two inner sections with `bg-muted/50 rounded-lg p-4` to visually distinguish the charts
- Title renamed to "Recent Product Sales"
- Recent sales spans full width below both charts

### 3. Changes to `Metrics.tsx`

Pass `transactions` to `ProductMetrics`:
```tsx
<ProductMetrics
  ...
  transactions={transactions}  // add this
/>
```

### Files changed

| File | Change |
|------|--------|
| `src/components/metrics/ProductMetrics.tsx` | Add `transactions` prop, fix recent sales data source, restructure into single card with inner chart sections |
| `src/pages/Metrics.tsx` | Pass `transactions` prop to `ProductMetrics` |

