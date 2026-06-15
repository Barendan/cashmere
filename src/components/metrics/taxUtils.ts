import { Transaction, Product, Sale, Service } from "@/models/types";
import { ServiceIncomeWithCategory, ParsedServiceCategory } from "./types";

const TZ = "America/New_York";

/** EST/EDT-aware YYYY-MM-DD parts of a date. */
const estParts = (d: Date): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
};

const estMonthKey = (d: Date): string => {
  const { year, month } = estParts(d);
  return `${year}-${String(month).padStart(2, "0")}`;
};

const estYear = (d: Date): number => estParts(d).year;

/**
 * Returns the UTC ms bounds for an EST quarter.
 * Quarter is 1-4. Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec.
 */
export const getQuarterRange = (
  year: number,
  quarter: 1 | 2 | 3 | 4
): { startMs: number; endMs: number; months: string[] } => {
  const startMonth = (quarter - 1) * 3 + 1; // 1,4,7,10
  const endMonth = startMonth + 2;

  // Find UTC ms that corresponds to start of startMonth/1 in EST and end of endMonth/last-day in EST.
  // EST offset is -5 (EDT -4). We resolve by binary-searching is overkill; use a safer approach:
  // construct a Date at UTC midnight for the EST day and adjust by the EST offset.
  const startMs = estDayStartMs(year, startMonth, 1);
  const endMs = estDayEndMs(year, endMonth, daysInMonth(year, endMonth));

  const months: string[] = [];
  for (let m = startMonth; m <= endMonth; m++) {
    months.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return { startMs, endMs, months };
};

const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

/** Offset in minutes for the EST timezone at the given UTC instant. */
const tzOffsetMinutes = (utcMs: number): number => {
  const d = new Date(utcMs);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach((p) => (map[p.type] = p.value));
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === "24" ? "0" : map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return (asUTC - utcMs) / 60000; // minutes
};

/** UTC ms corresponding to local EST midnight at the given Y-M-D. */
const estDayStartMs = (year: number, month: number, day: number): number => {
  // Initial guess: treat the Y-M-D as UTC midnight, then subtract the EST offset at that instant.
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  let off = tzOffsetMinutes(guess);
  let actual = guess - off * 60000;
  // Re-evaluate (DST safety)
  off = tzOffsetMinutes(actual);
  actual = guess - off * 60000;
  return actual;
};

const estDayEndMs = (year: number, month: number, day: number): number => {
  return estDayStartMs(year, month, day) + 24 * 60 * 60 * 1000 - 1;
};

export const monthLabel = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 15).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
};

// ---- Taxability ----

const STORAGE_RATE = "tax.rate";
const STORAGE_EXEMPT_PRODUCTS = "tax.exemptProductIds";
const STORAGE_TAXABLE_SERVICES = "tax.taxableServiceIds";

/** Florida state sales tax base. Counties may add a discretionary surtax. */
export const DEFAULT_TAX_RATE = 6;

export const loadTaxRate = (): number => {
  const v = localStorage.getItem(STORAGE_RATE);
  if (!v) return DEFAULT_TAX_RATE;
  const n = Number(v);
  return Number.isFinite(n) ? n : DEFAULT_TAX_RATE;
};

export const saveTaxRate = (rate: number | null) => {
  if (rate === null || !Number.isFinite(rate)) {
    localStorage.removeItem(STORAGE_RATE);
  } else {
    localStorage.setItem(STORAGE_RATE, String(rate));
  }
};

export const loadExemptProductIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_EXEMPT_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveExemptProductIds = (ids: string[]) => {
  localStorage.setItem(STORAGE_EXEMPT_PRODUCTS, JSON.stringify(ids));
};

export const loadTaxableServiceIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_TAXABLE_SERVICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveTaxableServiceIds = (ids: string[]) => {
  localStorage.setItem(STORAGE_TAXABLE_SERVICES, JSON.stringify(ids));
};

export const isProductTaxable = (
  productId: string,
  exemptIds: Set<string>
): boolean => !exemptIds.has(productId);

export const isServiceTaxable = (
  serviceId: string,
  taxableIds: Set<string>
): boolean => taxableIds.has(serviceId);

// ---- Report ----

export interface TaxBucket {
  gross: number;
  exempt: number;
  taxable: number;
  taxDue: number;
}

export interface TaxMonthRow extends TaxBucket {
  monthKey: string;
  label: string;
  productsGross: number;
  servicesGross: number;
  discounts: number;
  tips: number;
  cash: number;
  card: number;
  other: number;
}

export interface TaxReturnRow {
  date: string;
  monthKey: string;
  monthLabel: string;
  productName: string;
  quantity: number;
  amount: number;
  taxable: boolean;
}

export interface TaxReturnsSummary {
  count: number;
  totalAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  taxRefunded: number;
  rows: TaxReturnRow[];
}

export interface TaxReport {
  totals: TaxBucket & {
    discounts: number;
    net: number;
    tips: number;
  };
  byCategory: {
    products: TaxBucket;
    services: TaxBucket;
  };
  byPaymentMethod: {
    cash: number;
    card: number;
    other: number;
  };
  byMonth: TaxMonthRow[];
  returns: TaxReturnsSummary;
}

const emptyBucket = (): TaxBucket => ({
  gross: 0,
  exempt: 0,
  taxable: 0,
  taxDue: 0,
});

const inRange = (d: Date, startMs: number, endMs: number) => {
  const t = d.getTime();
  return t >= startMs && t <= endMs;
};

const paymentBucket = (
  method: string | undefined
): "cash" | "card" | "other" => {
  const m = (method || "").toLowerCase();
  if (m === "cash") return "cash";
  if (m === "card" || m === "credit" || m === "debit") return "card";
  return "other";
};

export interface ComputeTaxReportInput {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  rate: number; // percent, e.g. 6
  products: Product[];
  services: Service[];
  transactions: Transaction[];
  serviceIncomes: ServiceIncomeWithCategory[];
  sales: Sale[];
  exemptProductIds: Set<string>;
  taxableServiceIds: Set<string>;
}

export const computeTaxReport = ({
  year,
  quarter,
  rate,
  products,
  transactions,
  serviceIncomes,
  sales,
  exemptProductIds,
  taxableServiceIds,
}: ComputeTaxReportInput): TaxReport => {
  const { startMs, endMs, months } = getQuarterRange(year, quarter);
  const rateMul = rate / 100;

  const monthMap = new Map<string, TaxMonthRow>();
  months.forEach((mk) =>
    monthMap.set(mk, {
      monthKey: mk,
      label: monthLabel(mk),
      gross: 0,
      exempt: 0,
      taxable: 0,
      taxDue: 0,
      productsGross: 0,
      servicesGross: 0,
      discounts: 0,
      tips: 0,
      cash: 0,
      card: 0,
      other: 0,
    })
  );

  const productsBucket = emptyBucket();
  const servicesBucket = emptyBucket();
  let totalDiscounts = 0;
  let totalTips = 0;
  const payTotals = { cash: 0, card: 0, other: 0 };

  // Index sellable products
  const productById = new Map(products.map((p) => [p.id, p]));

  // ---- Product sales (transactions) ----
  transactions.forEach((t) => {
    if (t.type !== "sale") return;
    const d = new Date(t.date);
    if (!inRange(d, startMs, endMs)) return;

    const product = productById.get(t.productId);
    const taxable = product
      ? isProductTaxable(product.id, exemptProductIds)
      : !exemptProductIds.has(t.productId);
    const amount = t.price;
    const mk = estMonthKey(d);
    const row = monthMap.get(mk);
    if (!row) return;

    productsBucket.gross += amount;
    row.productsGross += amount;
    row.gross += amount;

    if (taxable) {
      productsBucket.taxable += amount;
      row.taxable += amount;
    } else {
      productsBucket.exempt += amount;
      row.exempt += amount;
    }
  });

  // ---- Service sales (serviceIncomes; parse multi-service rows) ----
  // Aggregate per finance transaction so we can apply discounts proportionally to taxable/exempt.
  interface FtAgg {
    monthKey: string;
    taxable: number;
    exempt: number;
    gross: number;
    discount: number;
    tip: number;
    paymentMethod?: string;
  }
  const ftAggs = new Map<string, FtAgg>();

  serviceIncomes.forEach((income) => {
    const d = new Date(income.date);
    if (!inRange(d, startMs, endMs)) return;
    const mk = estMonthKey(d);
    const row = monthMap.get(mk);
    if (!row) return;

    let lines: Array<{ serviceId: string; price: number }> = [];
    if (income.category) {
      try {
        const parsed = JSON.parse(income.category) as ParsedServiceCategory;
        if (
          Array.isArray(parsed.serviceIds) &&
          Array.isArray(parsed.servicePrices)
        ) {
          const subtotal = parsed.servicePrices.reduce((s, v) => s + v, 0) || 1;
          parsed.serviceIds.forEach((id, idx) => {
            const p = parsed.servicePrices?.[idx] || 0;
            lines.push({
              serviceId: id,
              price: (p / subtotal) * income.amount,
            });
          });
        }
      } catch {
        /* fall through */
      }
    }
    if (lines.length === 0) {
      lines = [{ serviceId: income.serviceId, price: income.amount }];
    }

    const ftId = income.financeTransactionId || `legacy-${income.id}`;
    let agg = ftAggs.get(ftId);
    if (!agg) {
      agg = {
        monthKey: mk,
        taxable: 0,
        exempt: 0,
        gross: 0,
        discount: income.discount || 0,
        tip: income.tipAmount || 0,
        paymentMethod: income.paymentMethod,
      };
      ftAggs.set(ftId, agg);
    }

    lines.forEach((ln) => {
      const taxable = isServiceTaxable(ln.serviceId, taxableServiceIds);
      servicesBucket.gross += ln.price;
      row.servicesGross += ln.price;
      row.gross += ln.price;
      if (taxable) {
        servicesBucket.taxable += ln.price;
        row.taxable += ln.price;
        agg.taxable += ln.price;
      } else {
        servicesBucket.exempt += ln.price;
        row.exempt += ln.price;
        agg.exempt += ln.price;
      }
      agg.gross += ln.price;
    });
  });

  // Apply per-FT discounts/tips/payments
  ftAggs.forEach((agg) => {
    const row = monthMap.get(agg.monthKey);
    if (!row) return;
    totalDiscounts += agg.discount;
    totalTips += agg.tip;
    row.discounts += agg.discount;
    row.tips += agg.tip;

    // NOTE: Do not subtract discount from taxable/exempt here — serviceIncomes[].amount
    // is already stored net-of-discount upstream in DataContext. Subtracting again
    // would double-deduct and under-report Tax Due.

    const pb = paymentBucket(agg.paymentMethod);
    payTotals[pb] += agg.gross;
    row[pb] += agg.gross;
  });

  // ---- Product sales payment methods (from sales table) ----
  sales.forEach((s) => {
    const d = new Date(s.date);
    if (!inRange(d, startMs, endMs)) return;
    const mk = estMonthKey(d);
    const row = monthMap.get(mk);
    if (!row) return;
    const pb = paymentBucket(s.paymentMethod);
    payTotals[pb] += s.totalAmount;
    row[pb] += s.totalAmount;
  });

  // ---- Returns / refunds (product transactions of type 'return') ----
  const returnsRows: TaxReturnRow[] = [];
  let returnsTaxable = 0;
  let returnsExempt = 0;
  transactions.forEach((t) => {
    if (t.type !== "return") return;
    const d = new Date(t.date);
    if (!inRange(d, startMs, endMs)) return;
    const product = productById.get(t.productId);
    const taxable = product
      ? isProductTaxable(product.id, exemptProductIds)
      : !exemptProductIds.has(t.productId);
    const amount = Math.abs(t.price);
    const qty = Math.abs(t.quantity);
    const mk = estMonthKey(d);
    const { year: yy, month: mm, day: dd } = estParts(d);
    if (taxable) returnsTaxable += amount;
    else returnsExempt += amount;
    returnsRows.push({
      date: `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
      monthKey: mk,
      monthLabel: monthLabel(mk),
      productName: t.productName || product?.name || "Unknown product",
      quantity: qty,
      amount,
      taxable,
    });
  });
  returnsRows.sort((a, b) => (a.date < b.date ? 1 : -1));

  // ---- Net refunds into headline filing numbers (DR-15 is cash basis, period of refund) ----
  // Returns card below still shows the audit trail.
  returnsRows.forEach((r) => {
    const row = monthMap.get(r.monthKey);
    productsBucket.gross -= r.amount;
    if (row) {
      row.gross -= r.amount;
      row.productsGross -= r.amount;
    }
    if (r.taxable) {
      productsBucket.taxable -= r.amount;
      if (row) row.taxable -= r.amount;
    } else {
      productsBucket.exempt -= r.amount;
      if (row) row.exempt -= r.amount;
    }
  });

  // Compute tax due per bucket / row (after refund netting)
  productsBucket.taxDue = productsBucket.taxable * rateMul;
  servicesBucket.taxDue = servicesBucket.taxable * rateMul;
  monthMap.forEach((row) => {
    row.taxDue = row.taxable * rateMul;
  });

  const totals = {
    gross: productsBucket.gross + servicesBucket.gross,
    exempt: productsBucket.exempt + servicesBucket.exempt,
    taxable: productsBucket.taxable + servicesBucket.taxable,
    taxDue: productsBucket.taxDue + servicesBucket.taxDue,
    discounts: totalDiscounts,
    net: 0,
    tips: totalTips,
  };
  totals.net = totals.gross - totals.discounts;

  return {
    totals,
    byCategory: { products: productsBucket, services: servicesBucket },
    byPaymentMethod: payTotals,
    byMonth: Array.from(monthMap.values()),
    returns: {
      count: returnsRows.length,
      totalAmount: returnsTaxable + returnsExempt,
      taxableAmount: returnsTaxable,
      exemptAmount: returnsExempt,
      taxRefunded: returnsTaxable * rateMul,
      rows: returnsRows,
    },
  };
};

// ---- CSV export ----

const csvEscape = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const generateTaxReportCsv = (
  report: TaxReport,
  year: number,
  quarter: number
): string => {
  const header = [
    "Month",
    "Gross",
    "Discounts",
    "Net",
    "Exempt",
    "Taxable",
    "Tax Due",
    "Tips",
    "Cash",
    "Card",
    "Other",
  ];
  const rows: (string | number)[][] = [header];
  report.byMonth.forEach((m) => {
    rows.push([
      m.label,
      m.gross.toFixed(2),
      m.discounts.toFixed(2),
      (m.gross - m.discounts).toFixed(2),
      m.exempt.toFixed(2),
      m.taxable.toFixed(2),
      m.taxDue.toFixed(2),
      m.tips.toFixed(2),
      m.cash.toFixed(2),
      m.card.toFixed(2),
      m.other.toFixed(2),
    ]);
  });
  rows.push([
    `Q${quarter} ${year} Total`,
    report.totals.gross.toFixed(2),
    report.totals.discounts.toFixed(2),
    report.totals.net.toFixed(2),
    report.totals.exempt.toFixed(2),
    report.totals.taxable.toFixed(2),
    report.totals.taxDue.toFixed(2),
    report.totals.tips.toFixed(2),
    report.byPaymentMethod.cash.toFixed(2),
    report.byPaymentMethod.card.toFixed(2),
    report.byPaymentMethod.other.toFixed(2),
  ]);

  // Returns / refunds section
  rows.push([]);
  rows.push(["Returns & Refunds"]);
  rows.push(["Date", "Product", "Qty", "Amount", "Taxable", "Month"]);
  report.returns.rows.forEach((r) => {
    rows.push([
      r.date,
      r.productName,
      r.quantity,
      r.amount.toFixed(2),
      r.taxable ? "Yes" : "No",
      r.monthLabel,
    ]);
  });
  rows.push([
    "Returns Total",
    "",
    report.returns.count,
    report.returns.totalAmount.toFixed(2),
    "",
    "",
  ]);
  rows.push([
    "Taxable Refunded",
    "",
    "",
    report.returns.taxableAmount.toFixed(2),
    "",
    "",
  ]);
  rows.push([
    "Tax Refunded",
    "",
    "",
    report.returns.taxRefunded.toFixed(2),
    "",
    "",
  ]);

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
};

export const downloadTaxReportCsv = (
  report: TaxReport,
  year: number,
  quarter: number
) => {
  const csv = generateTaxReportCsv(report, year, quarter);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Tax_Report_${year}_Q${quarter}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** All EST years with any transactions or service incomes, ascending. */
export const availableYears = (
  transactions: Transaction[],
  serviceIncomes: ServiceIncomeWithCategory[]
): number[] => {
  const years = new Set<number>();
  transactions.forEach((t) => {
    if (t.type === "sale") years.add(estYear(new Date(t.date)));
  });
  serviceIncomes.forEach((s) => years.add(estYear(new Date(s.date))));
  const currentYear = estYear(new Date());
  years.add(currentYear);
  return Array.from(years).sort((a, b) => a - b);
};

export const currentQuarter = (d: Date = new Date()): 1 | 2 | 3 | 4 => {
  const m = estParts(d).month;
  return (Math.floor((m - 1) / 3) + 1) as 1 | 2 | 3 | 4;
};
