import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Users, UserPlus, Receipt, DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDateEST } from "@/lib/format";
import { Transaction, Sale } from "@/models/types";
import { ServiceIncomeWithCategory, TimeRangeType } from "./types";
import MetricsCard from "./MetricsCard";
import MetricsBarChart from "./MetricsBarChart";
import DataTable from "./DataTable";
import {
  buildVisits,
  calculateVisitBuckets,
  calculatePeriodSummaries,
  calculateClientSummaries,
  calculateWeekdayPattern,
  calculateHourPattern,
  getPeriodLabels,
  generateClientsCsv,
  downloadCsv,
} from "./trafficUtils";

interface TrafficMetricsProps {
  transactions: Transaction[];
  sales: Sale[];
  serviceIncomes: ServiceIncomeWithCategory[];
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
}

const oneDecimal = (value: number) => value.toFixed(1);

const TrafficMetrics = ({
  transactions,
  sales,
  serviceIncomes,
  timeRange,
  setTimeRange,
}: TrafficMetricsProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const visits = useMemo(
    () => buildVisits(transactions, sales, serviceIncomes),
    [transactions, sales, serviceIncomes]
  );

  const buckets = useMemo(() => calculateVisitBuckets(visits, timeRange), [visits, timeRange]);
  const { current, previous } = useMemo(
    () => calculatePeriodSummaries(visits, timeRange),
    [visits, timeRange]
  );
  const { currentLabel, previousLabel } = useMemo(() => getPeriodLabels(timeRange), [timeRange]);
  const clients = useMemo(() => calculateClientSummaries(visits), [visits]);
  const weekdayPattern = useMemo(() => calculateWeekdayPattern(visits), [visits]);
  const hourPattern = useMemo(() => calculateHourPattern(visits), [visits]);

  const handleExport = () => {
    try {
      setIsExporting(true);
      if (clients.length === 0) return;
      downloadCsv(
        generateClientsCsv(clients),
        `spa-client-visits-${new Date().toISOString().split("T")[0]}.csv`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const clientColumns = [
    { key: "name", header: "Client", className: "font-medium whitespace-nowrap" },
    { key: "visits", header: "Visits", className: "text-right" },
    {
      key: "lastVisit",
      header: "Last Visit",
      className: "text-right whitespace-nowrap",
      formatter: (value: Date) => formatDateEST(value),
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      className: "text-right",
      formatter: (value: number) => formatCurrency(value || 0),
    },
    {
      key: "avgTicket",
      header: "Avg Ticket",
      className: "text-right",
      formatter: (_: unknown, item?: Record<string, any>) =>
        formatCurrency(item && item.visits > 0 ? item.totalSpent / item.visits : 0),
    },
    { key: "services", header: "Services", className: "text-right" },
    { key: "products", header: "Products", className: "text-right" },
  ];

  const rangeButtons: { value: TimeRangeType; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricsCard
          accent={1}
          title={`Visits (${currentLabel.toLowerCase()})`}
          value={current.visits}
          subLine={`${current.serviceTickets} service ticket${
            current.serviceTickets === 1 ? "" : "s"
          } · ${current.productOnlyTickets} product-only`}
          secondaryValue={previous.visits}
          secondaryLabel={previousLabel}
          icon={<Receipt className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>How many client visits happened {currentLabel.toLowerCase()}.</p>
              <p>
                One client = one visit. Back-to-back tickets for the same name (within 30 minutes)
                count once, services and products paid together count once, and standalone tips are
                not counted. Tickets with no name are grouped as one "unknown" client.
              </p>
            </>
          }

        />
        <MetricsCard
          accent={2}
          title={`Unique Clients (${currentLabel.toLowerCase()})`}
          value={current.uniqueClients}
          subLine={
            current.unnamedVisits > 0
              ? `${current.unnamedVisits} ticket${
                  current.unnamedVisits === 1 ? "" : "s"
                } had no client name`
              : undefined
          }
          secondaryValue={previous.uniqueClients}
          secondaryLabel={previousLabel}
          icon={<Users className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>How many different client names appear on those tickets.</p>
              <p>
                Counted by name (case-insensitive), so one client with two tickets counts once.
                Tickets left without a name still count as visits but not as a client.
              </p>
            </>
          }
        />
        <MetricsCard
          accent={3}
          title={`New Clients (${currentLabel.toLowerCase()})`}
          value={current.newClients}
          subLine={`${current.returningClients} returning`}
          secondaryValue={previous.newClients}
          secondaryLabel={previousLabel}
          icon={<UserPlus className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>Clients whose first-ever recorded visit falls inside this period.</p>
              <p>
                Everyone else is "returning" — they have an earlier ticket in the app's history. So
                4 unique with 1 new means 3 of them had visited before.
              </p>
            </>
          }
        />
        <MetricsCard
          accent={4}
          title="Avg Ticket"
          value={formatCurrency(current.avgTicket)}
          subLine={`${formatCurrency(current.revenue)} over ${current.visits} visit${
            current.visits === 1 ? "" : "s"
          }`}
          secondaryValue={formatCurrency(previous.avgTicket)}
          secondaryLabel={previousLabel}
          icon={<DollarSign className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>Average amount spent per visit.</p>
              <p>
                Total sales in the period ÷ visits. Amounts are after discounts and exclude tips.
              </p>
            </>
          }
        />
        <MetricsCard
          accent={5}
          title="Services Performed"
          value={current.services}
          subLine={`${oneDecimal(current.servicesPerVisit)} per visit`}
          secondaryValue={previous.services}
          secondaryLabel={previousLabel}
          icon={<Users className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>How many services were performed in the period.</p>
              <p>
                Counted from service line items on tickets ($0 tip placeholders excluded). "Per
                visit" is below 1 whenever some tickets were product-only.
              </p>
            </>
          }
        />
        <MetricsCard
          accent={6}
          title="Products Sold"
          value={current.products}
          subLine={`${oneDecimal(current.productsPerVisit)} per visit`}
          secondaryValue={previous.products}
          secondaryLabel={previousLabel}
          icon={<Receipt className="h-6 w-6 text-spa-deep" />}
          explanation={
            <>
              <p>How many product units were sold in the period.</p>
              <p>
                Counted from the quantities on product sale lines. "Per visit" is below 1 because
                most tickets are services only.
              </p>
            </>
          }
        />
      </div>


      <Card className="bg-white">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-spa-deep">Client Visits</CardTitle>
            <CardDescription>
              One visit = one checkout ticket (products and services rung up together count once)
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rangeButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={timeRange === btn.value ? "default" : "outline"}
                onClick={() => setTimeRange(btn.value)}
                className="text-xs"
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <MetricsBarChart
              data={buckets}
              dataKey="visits"
              nameKey="name"
              barName="Visits"
              barFill="#A6C0D0"
              tooltipType="number"
              tooltipLabel="Visits"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-spa-deep">Revenue per Visit</CardTitle>
          <CardDescription>Average ticket value over the same periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buckets} margin={{ top: 20, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Avg Ticket"]}
                  contentStyle={{ borderRadius: "0.375rem", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTicket"
                  name="Avg Ticket"
                  stroke="#8A9A8B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Busiest Days</CardTitle>
            <CardDescription>All recorded visits by day of week (EST)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <MetricsBarChart
                data={weekdayPattern}
                dataKey="visits"
                nameKey="name"
                barName="Visits"
                barFill="#D1C6B8"
                tooltipType="number"
                tooltipLabel="Visits"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Busiest Hours</CardTitle>
            <CardDescription>All recorded visits by hour of day (EST)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <MetricsBarChart
                data={hourPattern}
                dataKey="visits"
                nameKey="name"
                barName="Visits"
                barFill="#AECCC6"
                tooltipType="number"
                tooltipLabel="Visits"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-spa-deep">Clients</CardTitle>
            <CardDescription>
              Visit history by client name, most frequent first
              {current.unnamedVisits > 0 && (
                <> — {current.unnamedVisits} ticket(s) in this period had no client name</>
              )}
            </CardDescription>
          </div>
          <Button
            className="bg-spa-deep text-white shrink-0"
            onClick={handleExport}
            disabled={isExporting || clients.length === 0}
          >
            {isExporting ? (
              <>Loading...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={clients}
            columns={clientColumns}
            maxHeight="420px"
            emptyMessage="No named client visits recorded yet."
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Visits are counted from checkout tickets, hover any card to see how it is calculated. Tickets
        rung up without a client name still count as visits but cannot be attributed to a client, and
        names spelled differently are counted as separate clients. Standalone tips are excluded from
        visit counts
        {current.tipOnlyTickets > 0 && <> ({current.tipOnlyTickets} in this period)</>}.
      </p>

    </div>
  );
};

export default TrafficMetrics;
