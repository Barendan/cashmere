import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Receipt, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Product, Service, Transaction, Sale } from "@/models/types";
import { ServiceIncomeWithCategory } from "./types";
import {
  availableYears,
  computeTaxReport,
  currentQuarter,
  downloadTaxReportCsv,
  loadExemptProductIds,
  loadTaxRate,
  loadTaxableServiceIds,
  saveTaxRate,
} from "./taxUtils";
import TaxabilityManager from "./TaxabilityManager";

interface Props {
  products: Product[];
  services: Service[];
  transactions: Transaction[];
  serviceIncomes: ServiceIncomeWithCategory[];
  sales: Sale[];
}

const TaxReport: React.FC<Props> = ({
  products,
  services,
  transactions,
  serviceIncomes,
  sales,
}) => {
  const years = useMemo(
    () => availableYears(transactions, serviceIncomes),
    [transactions, serviceIncomes]
  );
  const [year, setYear] = useState<number>(years[years.length - 1]);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(currentQuarter());
  const [rateInput, setRateInput] = useState<string>(() => String(loadTaxRate()));
  const [savedRate, setSavedRate] = useState<number>(loadTaxRate());
  const [overridesVersion, setOverridesVersion] = useState(0);

  // Keep year in sync if years list grows
  useEffect(() => {
    if (!years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year]);

  const report = useMemo(() => {
    const exemptProductIds = new Set(loadExemptProductIds());
    const taxableServiceIds = new Set(loadTaxableServiceIds());
    return computeTaxReport({
      year,
      quarter,
      rate: savedRate,
      products,
      services,
      transactions,
      serviceIncomes,
      sales,
      exemptProductIds,
      taxableServiceIds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    year,
    quarter,
    savedRate,
    products,
    services,
    transactions,
    serviceIncomes,
    sales,
    overridesVersion,
  ]);

  const handleSaveRate = () => {
    const trimmed = rateInput.trim();
    if (trimmed === "") {
      saveTaxRate(null);
      setSavedRate(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return;
    saveTaxRate(n);
    setSavedRate(n);
  };

  const fmt = (v: number) => formatCurrency(v);
  const fmtTax = (v: number) => (savedRate === null ? "—" : formatCurrency(v));

  const Tile = ({
    label,
    value,
    accent,
  }: {
    label: string;
    value: string;
    accent?: string;
  }) => (
    <div
      className={`rounded-lg border bg-card px-4 py-3 ${accent || ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-spa-deep mt-1">{value}</div>
    </div>
  );

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-spa-deep flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Quarterly Tax Report
          </CardTitle>
          <CardDescription>
            Gross, exempt, taxable, and tax-due for sales-tax filing (EST).
          </CardDescription>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end gap-2 w-full lg:w-auto">
          <div className="min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">
              Year
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-full lg:w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">
              Quarter
            </label>
            <Select
              value={String(quarter)}
              onValueChange={(v) => setQuarter(Number(v) as 1 | 2 | 3 | 4)}
            >
              <SelectTrigger className="w-full lg:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 col-span-2 sm:col-span-1">
            <label className="text-xs text-muted-foreground block mb-1">
              Tax rate (%)
            </label>
            <div className="flex items-center gap-1">
              <Input
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="8.875"
                className="w-full lg:w-[100px] h-9"
                inputMode="decimal"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveRate}
                className="h-9 shrink-0"
              >
                Save
              </Button>
            </div>
          </div>
          <TaxabilityManager
            products={products}
            services={services}
            onSaved={() => setOverridesVersion((v) => v + 1)}
            trigger={
              <Button variant="outline" size="sm" className="h-9 w-full lg:w-auto">
                <Settings2 className="h-4 w-4 mr-1" />
                Manage Taxability
              </Button>
            }
          />
          <Button
            size="sm"
            className="h-9 bg-spa-deep text-white w-full lg:w-auto"
            onClick={() => downloadTaxReportCsv(report, year, quarter)}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <Tile label="Gross Sales" value={fmt(report.totals.gross)} />
          <Tile label="Discounts" value={fmt(report.totals.discounts)} />
          <Tile label="Net Sales" value={fmt(report.totals.net)} />
          <Tile label="Exempt Sales" value={fmt(report.totals.exempt)} />
          <Tile label="Taxable Sales" value={fmt(report.totals.taxable)} />
          <Tile
            label="Tax Due"
            value={fmtTax(report.totals.taxDue)}
            accent="bg-amber-50 border-amber-200"
          />
          <Tile label="Tips" value={fmt(report.totals.tips)} />
        </div>

        {/* Breakdown by category */}
        <div>
          <h4 className="text-sm font-semibold text-spa-deep mb-2">
            Breakdown by Category
          </h4>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-right px-3 py-2">Gross</th>
                  <th className="text-right px-3 py-2">Exempt</th>
                  <th className="text-right px-3 py-2">Taxable</th>
                  <th className="text-right px-3 py-2">Tax Due</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">Products</td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.products.gross)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.products.exempt)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.products.taxable)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmtTax(report.byCategory.products.taxDue)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Services</td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.services.gross)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.services.exempt)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.byCategory.services.taxable)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmtTax(report.byCategory.services.taxDue)}
                  </td>
                </tr>
                <tr className="border-t font-semibold bg-muted/30">
                  <td className="px-3 py-2">Total</td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.totals.gross)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.totals.exempt)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmt(report.totals.taxable)}
                  </td>
                  <td className="text-right px-3 py-2">
                    {fmtTax(report.totals.taxDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-spa-deep mb-2">
              By Payment Method (Gross)
            </h4>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <tbody>
                  <tr>
                    <td className="px-3 py-2">Cash</td>
                    <td className="text-right px-3 py-2">
                      {fmt(report.byPaymentMethod.cash)}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Card</td>
                    <td className="text-right px-3 py-2">
                      {fmt(report.byPaymentMethod.card)}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Other</td>
                    <td className="text-right px-3 py-2">
                      {fmt(report.byPaymentMethod.other)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-spa-deep mb-2">
              Monthly Sub-totals
            </h4>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2">Month</th>
                    <th className="text-right px-3 py-2">Gross</th>
                    <th className="text-right px-3 py-2">Taxable</th>
                    <th className="text-right px-3 py-2">Tax Due</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMonth.map((m) => (
                    <tr key={m.monthKey} className="border-t">
                      <td className="px-3 py-2">{m.label}</td>
                      <td className="text-right px-3 py-2">{fmt(m.gross)}</td>
                      <td className="text-right px-3 py-2">{fmt(m.taxable)}</td>
                      <td className="text-right px-3 py-2">
                        {fmtTax(m.taxDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {savedRate === null && (
          <p className="text-xs text-muted-foreground">
            Enter your sales-tax rate above and click Save to calculate "Tax
            Due". Defaults: products are taxable, services are exempt — use
            "Manage Taxability" to override per item.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxReport;
