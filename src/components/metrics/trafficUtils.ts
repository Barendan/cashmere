import { Transaction, Sale } from "@/models/types";
import { ServiceIncomeWithCategory, TimeRangeType } from "./types";

const TZ = "America/New_York";

/** "YYYY-MM-DD" in EST/EDT. */
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "2-digit",
  hour12: false,
});

export const estDayKey = (d: Date): string => dayFormatter.format(d);

const estMonthKey = (d: Date): string => estDayKey(d).slice(0, 7);

/** Monday-start week key, derived from the EST day key (no local-time drift). */
const weekKeyFromDayKey = (dayKey: string): string => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = utc.getUTCDay(); // 0 = Sunday
  const offset = dow === 0 ? 6 : dow - 1;
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc.toISOString().slice(0, 10);
};

const shiftDayKey = (dayKey: string, days: number): string => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
};

const shiftMonthKey = (monthKey: string, months: number): string => {
  const [y, m] = monthKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1 + months, 1));
  return utc.toISOString().slice(0, 7);
};

const labelForDayKey = (dayKey: string): string => {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const labelForMonthKey = (monthKey: string): string => {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
};

/** One checkout ticket. */
export interface VisitRecord {
  id: string;
  date: Date;
  dayKey: string;
  customerName: string | null;
  revenue: number; // net of discounts, excludes tips
  tip: number;
  serviceCount: number;
  productCount: number;
  paymentMethod?: string;
  /** Ticket that only recorded a standalone tip (no real service, no product, no revenue). */
  tipOnly?: boolean;
}

export interface VisitBucket {
  key: string;
  name: string;
  visits: number;
  revenue: number;
  avgTicket: number;
}

export interface ClientSummary {
  name: string;
  visits: number;
  lastVisit: Date;
  totalSpent: number;
  services: number;
  products: number;
}

export interface PeriodSummary {
  visits: number;
  uniqueClients: number;
  newClients: number;
  returningClients: number;
  revenue: number;
  services: number;
  products: number;
  avgTicket: number;
  servicesPerVisit: number;
  productsPerVisit: number;
  unnamedVisits: number;
  serviceTickets: number;
  productOnlyTickets: number;
  tipOnlyTickets: number;
}

const normalizeName = (name?: string | null): string | null => {
  const trimmed = (name || "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

const clientKey = (name: string): string => name.trim().toLowerCase();

/** $0 "Tip" placeholder services should not be counted as services performed. */
const isTipLineItem = (name?: string | null): boolean =>
  (name || "").trim().toLowerCase() === "tip";

/** Mixed sales are written as two records (services + products) seconds apart. */
const MERGE_WINDOW_MS = 120 * 1000;


/**
 * Builds one visit per checkout ticket from the cached metrics data.
 * Service tickets come from finance_transactions groups, product tickets from sales rows.
 * A product ticket recorded within two minutes of a service ticket (same payment method)
 * is treated as the same visit, which is how mixed sales are written.
 */
export const buildVisits = (
  transactions: Transaction[],
  sales: Sale[],
  serviceIncomes: ServiceIncomeWithCategory[]
): VisitRecord[] => {
  const serviceVisits = new Map<string, VisitRecord>();

  serviceIncomes.forEach((income) => {
    const key = income.financeTransactionId || `legacy-${income.id}`;
    const isTip = isTipLineItem(income.serviceName);
    const existing = serviceVisits.get(key);
    if (existing) {
      existing.revenue += income.amount || 0;
      if (!isTip) existing.serviceCount += 1;
      if (!existing.customerName) existing.customerName = normalizeName(income.customerName);
      if (new Date(income.date) < existing.date) existing.date = new Date(income.date);
      return;
    }
    const date = new Date(income.date);
    serviceVisits.set(key, {
      id: key,
      date,
      dayKey: estDayKey(date),
      customerName: normalizeName(income.customerName),
      revenue: income.amount || 0,
      tip: income.tipAmount || 0,
      serviceCount: isTip ? 0 : 1,
      productCount: 0,
      paymentMethod: income.paymentMethod,
    });
  });


  // Product units sold per sale
  const unitsBySale = new Map<string, number>();
  transactions.forEach((t) => {
    if (t.type !== "sale" || !t.saleId) return;
    unitsBySale.set(t.saleId, (unitsBySale.get(t.saleId) || 0) + (t.quantity || 0));
  });

  const serviceVisitList = Array.from(serviceVisits.values());
  const mergedInto = new Set<string>();
  const productVisits: VisitRecord[] = [];

  sales.forEach((sale) => {
    const date = new Date(sale.date);
    const units = unitsBySale.get(sale.id) || 0;
    const revenue = sale.totalAmount || 0;

    const match = serviceVisitList.find(
      (sv) =>
        !mergedInto.has(sv.id) &&
        Math.abs(sv.date.getTime() - date.getTime()) <= MERGE_WINDOW_MS &&
        (!sale.paymentMethod || !sv.paymentMethod || sale.paymentMethod === sv.paymentMethod)
    );

    if (match) {
      mergedInto.add(match.id);
      match.revenue += revenue;
      match.productCount += units;
      return;
    }

    productVisits.push({
      id: sale.id,
      date,
      dayKey: estDayKey(date),
      customerName: null,
      revenue,
      tip: 0,
      serviceCount: 0,
      productCount: units,
      paymentMethod: sale.paymentMethod,
    });
  });

  return [...serviceVisitList, ...productVisits]
    .map((v) => ({
      ...v,
      tipOnly: v.serviceCount === 0 && v.productCount === 0 && (v.revenue || 0) <= 0,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};


/** Bucket keys/labels for the chart, plus the current and previous period keys. */
const getBucketPlan = (timeRange: TimeRangeType, now: Date) => {
  const todayKey = estDayKey(now);

  if (timeRange === "daily") {
    const keys: string[] = [];
    for (let i = 13; i >= 0; i--) keys.push(shiftDayKey(todayKey, -i));
    return {
      keys,
      label: labelForDayKey,
      keyOf: (v: VisitRecord) => v.dayKey,
      current: todayKey,
      previous: shiftDayKey(todayKey, -1),
      currentLabel: "Today",
      previousLabel: "Yesterday",
    };
  }

  if (timeRange === "weekly") {
    const currentWeek = weekKeyFromDayKey(todayKey);
    const keys: string[] = [];
    for (let i = 7; i >= 0; i--) {
      keys.push(weekKeyFromDayKey(shiftDayKey(currentWeek, -i * 7)));
    }
    return {
      keys,
      label: (k: string) => `Wk ${labelForDayKey(k)}`,
      keyOf: (v: VisitRecord) => weekKeyFromDayKey(v.dayKey),
      current: currentWeek,
      previous: weekKeyFromDayKey(shiftDayKey(currentWeek, -7)),
      currentLabel: "This week",
      previousLabel: "Last week",
    };
  }

  const currentMonth = estMonthKey(now);
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) keys.push(shiftMonthKey(currentMonth, -i));
  return {
    keys,
    label: labelForMonthKey,
    keyOf: (v: VisitRecord) => v.dayKey.slice(0, 7),
    current: currentMonth,
    previous: shiftMonthKey(currentMonth, -1),
    currentLabel: "This month",
    previousLabel: "Last month",
  };
};

/** Tip-only tickets are not client visits — they are payments attached to an earlier visit. */
const countableVisits = (visits: VisitRecord[]) => visits.filter((v) => !v.tipOnly);

export const calculateVisitBuckets = (
  visits: VisitRecord[],
  timeRange: TimeRangeType,
  now: Date = new Date()
): VisitBucket[] => {
  const plan = getBucketPlan(timeRange, now);
  const map = new Map<string, VisitBucket>();
  plan.keys.forEach((key) => {
    map.set(key, { key, name: plan.label(key), visits: 0, revenue: 0, avgTicket: 0 });
  });

  countableVisits(visits).forEach((visit) => {
    const bucket = map.get(plan.keyOf(visit));
    if (!bucket) return;
    bucket.visits += 1;
    bucket.revenue += visit.revenue;
  });

  return plan.keys.map((key) => {
    const bucket = map.get(key)!;
    return { ...bucket, avgTicket: bucket.visits > 0 ? bucket.revenue / bucket.visits : 0 };
  });
};

export const getPeriodLabels = (timeRange: TimeRangeType, now: Date = new Date()) => {
  const plan = getBucketPlan(timeRange, now);
  return { currentLabel: plan.currentLabel, previousLabel: plan.previousLabel };
};

const summarize = (
  allPeriodVisits: VisitRecord[],
  firstVisitDayByClient: Map<string, string>,
  /** "YYYY-MM-DD" EST day the period starts on. */
  periodStartDayKey: string
): PeriodSummary => {
  const periodVisits = countableVisits(allPeriodVisits);
  const clients = new Set<string>();
  let revenue = 0;
  let services = 0;
  let products = 0;
  let unnamed = 0;
  let serviceTickets = 0;
  let productOnlyTickets = 0;

  periodVisits.forEach((v) => {
    revenue += v.revenue;
    services += v.serviceCount;
    products += v.productCount;
    if (v.serviceCount > 0) serviceTickets += 1;
    else if (v.productCount > 0) productOnlyTickets += 1;
    if (v.customerName) clients.add(clientKey(v.customerName));
    else unnamed += 1;
  });

  let newClients = 0;
  clients.forEach((key) => {
    const firstDay = firstVisitDayByClient.get(key);
    if (firstDay !== undefined && firstDay >= periodStartDayKey) newClients += 1;
  });

  const visits = periodVisits.length;
  return {
    visits,
    uniqueClients: clients.size,
    newClients,
    returningClients: Math.max(clients.size - newClients, 0),
    revenue,
    services,
    products,
    avgTicket: visits > 0 ? revenue / visits : 0,
    servicesPerVisit: visits > 0 ? services / visits : 0,
    productsPerVisit: visits > 0 ? products / visits : 0,
    unnamedVisits: unnamed,
    serviceTickets,
    productOnlyTickets,
    tipOnlyTickets: allPeriodVisits.length - visits,
  };
};

/** Month keys ("YYYY-MM") start on the first day; day/week keys already are day keys. */
const startDayKeyOf = (periodKey: string): string =>
  periodKey.length === 7 ? `${periodKey}-01` : periodKey;

export const calculatePeriodSummaries = (
  visits: VisitRecord[],
  timeRange: TimeRangeType,
  now: Date = new Date()
): { current: PeriodSummary; previous: PeriodSummary } => {
  const plan = getBucketPlan(timeRange, now);

  const firstVisitDayByClient = new Map<string, string>();
  countableVisits(visits).forEach((v) => {
    if (!v.customerName) return;
    const key = clientKey(v.customerName);
    const existing = firstVisitDayByClient.get(key);
    if (existing === undefined || v.dayKey < existing) firstVisitDayByClient.set(key, v.dayKey);
  });

  const currentVisits = visits.filter((v) => plan.keyOf(v) === plan.current);
  const previousVisits = visits.filter((v) => plan.keyOf(v) === plan.previous);

  return {
    current: summarize(currentVisits, firstVisitDayByClient, startDayKeyOf(plan.current)),
    previous: summarize(previousVisits, firstVisitDayByClient, startDayKeyOf(plan.previous)),
  };
};


export const calculateClientSummaries = (visits: VisitRecord[]): ClientSummary[] => {
  const map = new Map<string, ClientSummary>();

  countableVisits(visits).forEach((visit) => {
    if (!visit.customerName) return;
    const key = clientKey(visit.customerName);
    const existing = map.get(key);
    if (existing) {
      existing.visits += 1;
      existing.totalSpent += visit.revenue;
      existing.services += visit.serviceCount;
      existing.products += visit.productCount;
      if (visit.date > existing.lastVisit) existing.lastVisit = visit.date;
      return;
    }
    map.set(key, {
      name: visit.customerName,
      visits: 1,
      lastVisit: visit.date,
      totalSpent: visit.revenue,
      services: visit.serviceCount,
      products: visit.productCount,
    });
  });

  return Array.from(map.values()).sort((a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent);
};

export interface PatternPoint {
  name: string;
  visits: number;
}

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const calculateWeekdayPattern = (visits: VisitRecord[]): PatternPoint[] => {
  const counts = new Map<string, number>(WEEKDAY_ORDER.map((d) => [d, 0]));
  countableVisits(visits).forEach((v) => {
    const day = weekdayFormatter.format(v.date);
    counts.set(day, (counts.get(day) || 0) + 1);
  });
  return WEEKDAY_ORDER.map((name) => ({ name, visits: counts.get(name) || 0 }));
};

export const calculateHourPattern = (visits: VisitRecord[]): PatternPoint[] => {
  const counts = new Map<number, number>();
  countableVisits(visits).forEach((v) => {
    const hour = Number(hourFormatter.format(v.date).replace(/\D/g, ""));
    counts.set(hour, (counts.get(hour) || 0) + 1);
  });
  const hours = Array.from(counts.keys()).sort((a, b) => a - b);
  return hours.map((h) => ({
    name: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`,
    visits: counts.get(h) || 0,
  }));
};

const csvCell = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export const generateClientsCsv = (clients: ClientSummary[]): string => {
  let csv = "Client,Visits,Last Visit,Total Spent,Services,Products,Avg Ticket\n";
  clients.forEach((c) => {
    const avg = c.visits > 0 ? c.totalSpent / c.visits : 0;
    csv += [
      csvCell(c.name),
      c.visits,
      csvCell(estDayKey(c.lastVisit)),
      c.totalSpent.toFixed(2),
      c.services,
      c.products,
      avg.toFixed(2),
    ].join(",") + "\n";
  });
  return csv;
};

export const downloadCsv = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
