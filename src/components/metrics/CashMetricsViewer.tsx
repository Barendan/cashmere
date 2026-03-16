import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import MetricsBarChart from "./MetricsBarChart";
import MetricsCard from "./MetricsCard";
import { Sale } from "@/models/types";
import { ServiceIncomeWithCategory } from "./types";
import { 
  getLast30DaysRange, 
  calculateDailyCashIncome,
  calculateWeeklyCashIncome,
  calculateMonthlyCashIncome,
  calculateCashIncome,
  getDateRanges
} from "./metricsUtils";
import { format } from "date-fns";

interface CashMetricsViewerProps {
  sales: Sale[];
  serviceIncomes: ServiceIncomeWithCategory[];
}

type ViewMode = "daily" | "weekly" | "monthly";

const CashMetricsViewer = ({ sales, serviceIncomes }: CashMetricsViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  const dateRanges = useMemo(() => getDateRanges(), []);
  const { startOfToday, startOfMonth } = dateRanges;
  
  const { startOfCurrentWeek, endOfCurrentWeek, endOfCurrentMonth, today } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    return {
      startOfCurrentWeek: weekStart,
      endOfCurrentWeek: weekEnd,
      endOfCurrentMonth: monthEnd,
      today: now
    };
  }, []);

  const todayCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfToday, today);
  }, [sales, serviceIncomes, startOfToday, today]);

  const weekCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfCurrentWeek, endOfCurrentWeek);
  }, [sales, serviceIncomes, startOfCurrentWeek, endOfCurrentWeek]);

  const monthCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfMonth, endOfCurrentMonth);
  }, [sales, serviceIncomes, startOfMonth, endOfCurrentMonth]);

  const todayDateRange = useMemo(() => format(today, "MMM d, yyyy"), [today]);
  const weekDateRange = useMemo(() => `${format(startOfCurrentWeek, "MMM d")} - ${format(endOfCurrentWeek, "MMM d, yyyy")}`, [startOfCurrentWeek, endOfCurrentWeek]);
  const monthDateRange = useMemo(() => `${format(startOfMonth, "MMM d")} - ${format(endOfCurrentMonth, "MMM d, yyyy")}`, [startOfMonth, endOfCurrentMonth]);

  const chartData = useMemo(() => {
    if (viewMode === "daily") {
      const range = getLast30DaysRange();
      const dailyData = calculateDailyCashIncome(sales, serviceIncomes, range.startDate, range.endDate);
      return dailyData.map(day => ({
        date: format(new Date(day.date), "MMM d"),
        cash: day.cash
      }));
    } else if (viewMode === "weekly") {
      const weeklyData = calculateWeeklyCashIncome(sales, serviceIncomes, 10);
      return weeklyData.map(week => ({
        date: week.weekLabel,
        cash: week.cash
      }));
    } else {
      const monthlyData = calculateMonthlyCashIncome(sales, serviceIncomes, 12);
      return monthlyData.map(month => ({
        date: month.monthLabel,
        cash: month.cash
      }));
    }
  }, [viewMode, sales, serviceIncomes]);

  const barFill = useMemo(() => {
    if (viewMode === "daily") return "#FCD34D";
    if (viewMode === "weekly") return "#AECCC6";
    return "#7E9A9A";
  }, [viewMode]);

  const chartHeight = 350;

  return (
    <Card className="bg-muted/30 border border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-spa-deep flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Cash Overview
        </CardTitle>
        <CardDescription>Track your cash income at a glance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards with distinct backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Cash Today"
            value={formatCurrency(todayCash)}
            icon={<Coins className="h-6 w-6 text-amber-700" />}
            iconBgClass="bg-amber-200"
            dateRange={todayDateRange}
            className="bg-amber-50 border-amber-200 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-default"
          />
          
          <MetricsCard
            title="Cash This Week"
            value={formatCurrency(weekCash)}
            icon={<Coins className="h-6 w-6 text-sky-700" />}
            iconBgClass="bg-sky-200"
            dateRange={weekDateRange}
            className="bg-sky-50 border-sky-200 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-default"
          />
          
          <MetricsCard
            title="Cash This Month"
            value={formatCurrency(monthCash)}
            icon={<Coins className="h-6 w-6 text-emerald-700" />}
            iconBgClass="bg-emerald-200"
            dateRange={monthDateRange}
            className="bg-emerald-50 border-emerald-200 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-default"
          />
        </div>

        {/* Trends Chart — borderless since nested */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-spa-deep flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Cash Income Trends
              </h3>
              <p className="text-sm text-muted-foreground">Track your cash flow over time</p>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-white border border-border">
                <TabsTrigger 
                  value="daily"
                  className="data-[state=active]:bg-spa-deep data-[state=active]:text-white"
                >
                  Daily
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly"
                  className="data-[state=active]:bg-spa-deep data-[state=active]:text-white"
                >
                  Weekly
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly"
                  className="data-[state=active]:bg-spa-deep data-[state=active]:text-white"
                >
                  Monthly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div style={{ minHeight: `${chartHeight}px`, height: `${chartHeight}px` }}>
            {chartData.length > 0 ? (
              <MetricsBarChart
                data={chartData}
                dataKey="cash"
                nameKey="date"
                barName="Cash"
                barFill={barFill}
                tooltipType="currency"
                tooltipLabel="Cash"
                categoryGap="5%"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Coins className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cash transactions for this period</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashMetricsViewer;
