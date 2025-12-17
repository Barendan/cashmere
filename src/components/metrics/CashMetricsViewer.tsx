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

  // Get date ranges for summary cards
  const dateRanges = useMemo(() => getDateRanges(), []);
  const { startOfToday, startOfMonth } = dateRanges;
  
  // Calculate week and month ranges (memoized)
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

  // Summary cards calculations
  const todayCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfToday, today);
  }, [sales, serviceIncomes, startOfToday, today]);

  const weekCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfCurrentWeek, endOfCurrentWeek);
  }, [sales, serviceIncomes, startOfCurrentWeek, endOfCurrentWeek]);

  const monthCash = useMemo(() => {
    return calculateCashIncome(sales, serviceIncomes, startOfMonth, endOfCurrentMonth);
  }, [sales, serviceIncomes, startOfMonth, endOfCurrentMonth]);

  // Format date ranges for summary cards
  const todayDateRange = useMemo(() => {
    return format(today, "MMM d, yyyy");
  }, [today]);

  const weekDateRange = useMemo(() => {
    return `${format(startOfCurrentWeek, "MMM d")} - ${format(endOfCurrentWeek, "MMM d, yyyy")}`;
  }, [startOfCurrentWeek, endOfCurrentWeek]);

  const monthDateRange = useMemo(() => {
    return `${format(startOfMonth, "MMM d")} - ${format(endOfCurrentMonth, "MMM d, yyyy")}`;
  }, [startOfMonth, endOfCurrentMonth]);

  // Chart data based on view mode
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

  // Chart colors based on view mode
  const barFill = useMemo(() => {
    if (viewMode === "daily") return "#FCD34D"; // Yellow
    if (viewMode === "weekly") return "#AECCC6"; // Spa sage
    return "#7E9A9A"; // Spa deep
  }, [viewMode]);

  // Chart height - use 350px for all views
  const chartHeight = 350;

  return (
    <div className="space-y-6">
      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricsCard
          title="Cash Today"
          value={formatCurrency(todayCash)}
          icon={<Coins className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-yellow-100"
          dateRange={todayDateRange}
          className="transition-all duration-200 shadow-md hover:shadow-lg border border-spa-sage/20 hover:scale-[1.02] cursor-default"
        />
        
        <MetricsCard
          title="Cash This Week"
          value={formatCurrency(weekCash)}
          icon={<Coins className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-water/20"
          dateRange={weekDateRange}
          className="transition-all duration-200 shadow-md hover:shadow-lg border border-spa-sage/20 hover:scale-[1.02] cursor-default"
        />
        
        <MetricsCard
          title="Cash This Month"
          value={formatCurrency(monthCash)}
          icon={<Coins className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-sage/20"
          dateRange={monthDateRange}
          className="transition-all duration-200 shadow-md hover:shadow-lg border border-spa-sage/20 hover:scale-[1.02] cursor-default"
        />
      </div>

      {/* Detailed View Section */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-spa-deep flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Cash Income Trends
              </CardTitle>
              <CardDescription>Track your cash flow over time</CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-white border border-spa-sage/20">
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CashMetricsViewer;
