

## Metrics Page UI Overhaul Plan

### Step 1: Enlarge Products/Services Tabs
**File: `src/pages/Metrics.tsx`** (~4 LOC changed)

Make the tab triggers ~2x larger by increasing padding, font size, and icon size:
- `TabsTrigger`: add `text-base px-6 py-3` (currently inherits small defaults)
- Icons: change from `h-4 w-4` to `h-5 w-5`
- `TabsList`: add `h-auto` to allow the taller triggers

### Step 2: Update Sales Overview Titles
**File: `src/components/metrics/ProductMetrics.tsx`** (~2 LOC changed)

- Title: `"Sales Overview"` → `"Product Sales Overview"`
- Description: `"Track your sales performance"` → `"Track your product sales"`

### Step 3: Merge Items Sold Chart into Sales Overview Card
**File: `src/components/metrics/ProductMetrics.tsx`** (~20 LOC changed)

Remove the standalone "Items Sold Over Time" card. Inside the existing Sales Overview card, render both charts stacked vertically with a subtle separator between them:

```text
┌─ Product Sales Overview ─────────────────────────┐
│  [7 Days] [30 Days] [Monthly]                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Revenue bar chart (300px)                   │ │
│  └──────────────────────────────────────────────┘ │
│  ── separator ──                                  │
│  Product Items Sold Over Time (subtitle, no desc) │
│  ┌──────────────────────────────────────────────┐ │
│  │  Items sold bar chart (250px)                │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

- Add a small `<h4>` label: "Product Items Sold Over Time" above the second chart
- No helper text about time range

### Step 4: Upgrade Product Performance Chart
**File: `src/components/metrics/ProductMetrics.tsx`** (~15 LOC changed)

Currently shows only top 6 products in a horizontal bar chart with just profit. Improve by:
- Show **all products** (up to 10) instead of slicing to 6
- Add a **second bar** for Revenue alongside Profit (dual-bar grouped chart) so you can visually compare revenue vs profit per product
- Use distinct colors: keep `#9CB380` for Profit, add `#AECCC6` for Revenue
- This requires passing a second `Bar` element — we'll switch from using `MetricsBarChart` to a direct `BarChart` render inline (same pattern, just two `<Bar>` elements)
- Keep the same card dimensions (h-[300px])

This 10Xs the insight: you now see revenue vs profit per product, instantly revealing margin health.

### Step 5: Scrollable Product Profitability Table
**File: `src/components/metrics/ProductMetrics.tsx`** (~2 LOC changed)

The `DataTable` component already has a `ScrollArea` with `maxHeight` prop (defaults to `"30vh"`). Pass a fixed `maxHeight="400px"` explicitly to ensure a visible scrollbar appears when products exceed the container. The sticky header already works.

### Step 6: Cash Metrics — Unified Container with Color Differentiation
**File: `src/components/metrics/CashMetricsViewer.tsx`** (~30 LOC changed)

Wrap everything (3 summary cards + trends chart) in a single outer `Card` with a subtle background. Apply distinct background tints to each summary card:

```text
┌─ Cash Overview (outer card, bg-spa-sage/5 border) ──────┐
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Cash Today  │ │ Cash Week   │ │ Cash Month  │       │
│  │ bg-amber-50 │ │ bg-blue-50  │ │ bg-green-50 │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                          │
│  ┌─ Cash Income Trends chart ─────────────────────────┐ │
│  │  [Daily] [Weekly] [Monthly]                        │ │
│  │  chart...                                          │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- Outer card: light border, subtle background tint, shared title "Cash Overview"
- Each MetricsCard gets a distinct `className` with colored backgrounds (`bg-amber-50`, `bg-sky-50`, `bg-emerald-50`)
- The inner trends chart card becomes borderless (`shadow-none border-0`) since it's nested

### Summary

| | |
|---|---|
| **Files changed** | 3 (`Metrics.tsx`, `ProductMetrics.tsx`, `CashMetricsViewer.tsx`) |
| **LOC added/changed** | ~75 |
| **New dependencies** | None |
| **Risk** | Low — purely visual changes, no data logic affected |

