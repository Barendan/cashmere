## Florida tax default, discount-adjusted taxable base, and a Returns/Refunds section

### Research: Florida sales tax
- **Florida state sales tax: 6.0%** (applies to taxable retail goods statewide).
- Counties add a **discretionary sales surtax** (typically 0.5%–1.5%) on top — varies by county, and only applies to the first $5,000 of a single tangible-personal-property sale.
- Recommendation: **default to 6.0%** (state base) and keep the rate field editable so you can add your county surtax (e.g. 6.5%, 7.0%, 7.5%) without code changes. We'll show a small helper note under the field.

### Are we handling discounts in the taxable base today?
**No.** In `taxUtils.ts > computeTaxReport`:
- Product line amounts (`t.price`) and service line allocations are added to `gross` / `taxable` / `exempt` **before** discounts.
- `totalDiscounts` is tracked per finance transaction and shown as a tile and CSV column, and subtracted only from `net`.
- **Tax Due = taxable × rate**, where `taxable` is pre-discount → this **over-reports tax owed** whenever there's a discount on a taxable sale.

Also: returns are currently **silently dropped** — only `t.type === "sale"` is included; refunded product transactions don't appear anywhere on the Tax tab.

### Fix plan (minimal, surgical)

**1. Default rate to Florida 6%** (`taxUtils.ts` + `TaxReport.tsx`)
- `loadTaxRate()` returns `6` instead of `null` when nothing is saved. Treat "user has not saved yet" as "use 6% default" so Tax Due always renders.
- Remove the "—" fallback and the "Enter your sales-tax rate" hint; replace with a small caption: *"Florida state base is 6%. Add your county discretionary surtax if applicable."*

**2. Allocate discounts into the taxable base (accurate Tax Due)**
For each service finance-transaction (the only place discounts live in our schema, per memory), after we sum its service lines into taxable/exempt:
- Compute `taxableShare = taxableForThisFT / grossForThisFT` (0 if gross is 0).
- Subtract `discount × taxableShare` from `servicesBucket.taxable` and the matching month's `taxable`.
- Subtract `discount × (1 - taxableShare)` from `servicesBucket.exempt` and the month's `exempt` (keeps exempt accurate too).
- Tax Due is then `taxable_after_discount × rate` — correct.
- Net stays `gross − discounts` (unchanged display).
- Products have no per-sale discount field in our data (confirmed via memory), so no product-side allocation needed.

**3. Returns & Refunds section (new, at the bottom of the Tax tab)**
Extend `TaxReport` shape with a `returns` block:
```ts
returns: {
  totalCount: number;
  totalAmount: number;       // sum of refunded amounts in quarter
  taxableAmount: number;     // portion that was taxable
  taxRefunded: number;       // taxableAmount × rate
  rows: Array<{
    date: string;            // EST yyyy-mm-dd
    productName: string;
    quantity: number;        // |t.quantity|
    amount: number;          // |t.price|
    taxable: boolean;
    monthLabel: string;
  }>;
}
```
- Source: `transactions` where `t.type === "return"` and date is in the EST quarter range.
- Use `productById` + `exemptProductIds` to determine taxability (same rule as sales).
- Render as a new card section beneath the monthly table:
  - 4 small tiles: **# Returns**, **Refunded Amount**, **Taxable Refunded**, **Tax Refunded**.
  - Table: Date | Product | Qty | Amount | Taxable? | Month — wrapped in `overflow-x-auto`, `min-w-[640px]`.
  - Empty state: *"No returns or refunds this quarter."*
- These are **kept separate** from Gross/Taxable tiles (not netted in) so the headline numbers still match what was sold; the returns card stands alone for filing-time review. Add a one-line note: *"Returns are listed separately and are not subtracted from the totals above."*

**4. CSV export**
Append a blank row, then a `Returns` section to the same CSV:
```
Returns
Date,Product,Qty,Amount,Taxable,Month
...
Returns Total,,,<amount>,,
Tax Refunded,,,<taxRefunded>,,
```

### Files changed
| File | Change |
|---|---|
| `src/components/metrics/taxUtils.ts` | `loadTaxRate` defaults to 6; allocate discounts into taxable/exempt; add `returns` to `TaxReport`; aggregate `type==='return'` transactions; extend CSV. |
| `src/components/metrics/TaxReport.tsx` | Show "FL 6%" helper text; render new Returns & Refunds card with tiles + responsive table. |

No DB changes, no new dependencies, no changes outside the Tax tab.

### Acceptance checks
- Fresh load with no saved rate → tiles show Tax Due using 6%.
- A quarter with a discounted, fully-taxable service: Tax Due ≈ `(gross − discount) × 6%` (within cents).
- A return transaction in the quarter appears in the Returns table; headline Gross/Taxable are unchanged.
- CSV contains both the monthly section and the Returns section.
- On mobile, Returns table scrolls horizontally; no overflow breaks the card.
