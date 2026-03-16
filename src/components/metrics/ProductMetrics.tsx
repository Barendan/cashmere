
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, DollarSign, ArrowUp, ShoppingBag } from "lucide-react";
import { formatCurrency, formatPercent, formatTooltipValue, formatDateEST } from "@/lib/format";
import MetricsCard from "./MetricsCard";
import MetricsBarChart from "./MetricsBarChart";
import MetricsPieChart from "./MetricsPieChart";
import DataTable from "./DataTable";
import { ProductMetricsProps } from "./types";
import { Sale, Transaction } from "@/models/types";
import { ServiceIncomeWithCategory } from "./types";
import { exportMonthlyProductSales } from "./metricsUtils";
import CashMetricsViewer from "./CashMetricsViewer";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";

interface DailyProductMetricsProps extends Omit<ProductMetricsProps, 'totalRevenue' | 'totalProfit' | 'totalItemsSold'> {
  todayRevenue: number;
  todayProfit: number;
  todayItemsSold: number;
  yesterdayRevenue: number;
  yesterdayProfit: number;
  yesterdayItemsSold: number;
  itemsSoldData: { date: string; revenue: number }[];
  sales: Sale[];
  serviceIncomes: ServiceIncomeWithCategory[];
  transactions: Transaction[];
}


const ProductMetrics = ({
  todayRevenue,
  todayProfit,
  todayItemsSold,
  yesterdayRevenue,
  yesterdayProfit,
  yesterdayItemsSold,
  salesData,
  itemsSoldData,
  productPerformance,
  categoryData,
  timeRange,
  setTimeRange,
  exportCSV,
  isExporting = false,
  sales,
  serviceIncomes,
  transactions
}: DailyProductMetricsProps) => {
  const productColumns = [
    { key: "name", header: "Product Name", className: "font-medium" },
    { 
      key: "totalSold", 
      header: "Quantity Sold", 
      className: "text-right", 
      formatter: (value: any) => value || 0
    },
    { 
      key: "totalRevenue", 
      header: "Revenue", 
      className: "text-right", 
      formatter: (value: any) => formatCurrency(value || 0) 
    },
    { 
      key: "costPrice", 
      header: "Cost", 
      className: "text-right", 
      formatter: (value: any, item: any) => {
        if (!item || typeof value !== 'number') return formatCurrency(0);
        return formatCurrency(value * (item.totalSold || 0));
      }
    },
    { 
      key: "profit", 
      header: "Profit", 
      className: "text-right", 
      formatter: (value: any) => formatCurrency(value || 0) 
    },
    { 
      key: "profitMargin", 
      header: "Profit Margin", 
      className: "text-right", 
      formatter: (value: any, item: any) => {
        if (!item || typeof item.totalRevenue !== 'number' || item.totalRevenue <= 0) {
          return "0%";
        }
        return formatPercent((item.profit / item.totalRevenue) * 100);
      }
    }
  ];

  // Dual-bar tooltip for product performance
  const DualBarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white p-3 border border-border rounded-md shadow-md">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatTooltipValue(entry.value || 0, "currency")}
          </p>
        ))}
      </div>
    );
  };

  const formatLabel = (value: string) => {
    if (!value) return value;
    return value.length > 15 ? `${value.substring(0, 15)}...` : value;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricsCard 
          title="Today's Revenue" 
          value={formatCurrency(todayRevenue)}
          secondaryValue={formatCurrency(yesterdayRevenue)}
          icon={<DollarSign className="h-6 w-6 text-spa-deep" />}
        />
        
        <MetricsCard 
          title="Today's Profit" 
          value={formatCurrency(todayProfit)}
          secondaryValue={formatCurrency(yesterdayProfit)}
          icon={<ArrowUp className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-water/20"
        />
        
        <MetricsCard 
          title="Items Sold Today" 
          value={todayItemsSold}
          secondaryValue={yesterdayItemsSold}
          icon={<ShoppingBag className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-stone/20"
        />
      </div>

      {/* Sales Overview + Items Sold + Recent Sales in one container */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Sales Dashboard</CardTitle>
            <CardDescription>Product sales overview and recent activity</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={timeRange === "daily" ? "default" : "outline"} 
              onClick={() => setTimeRange("daily")}
              className="text-xs"
            >
              Daily
            </Button>
            <Button 
              variant={timeRange === "weekly" ? "default" : "outline"} 
              onClick={() => setTimeRange("weekly")}
              className="text-xs"
            >
              Weekly
            </Button>
            <Button 
              variant={timeRange === "monthly" ? "default" : "outline"} 
              onClick={() => setTimeRange("monthly")}
              className="text-xs"
            >
              Monthly
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-spa-deep mb-3">Product Sales Overview</h4>
              <div className="h-[250px]">
                <MetricsBarChart 
                  data={salesData}
                  dataKey="revenue"
                  nameKey="date"
                  barName="Revenue"
                  barFill="#AECCC6"
                  tooltipType="currency"
                  tooltipLabel="Revenue"
                />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-spa-deep mb-3">Items Sold Over Time</h4>
              <div className="h-[250px]">
                <MetricsBarChart 
                  data={itemsSoldData}
                  dataKey="revenue"
                  nameKey="date"
                  barName="Items Sold"
                  barFill="#D4A574"
                  tooltipType="number"
                  tooltipLabel="Items Sold"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Recent Product Sales - full width */}
          <div>
            <h4 className="text-sm font-semibold text-spa-deep mb-2">Recent Product Sales</h4>
            <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1">
              {(() => {
                const recentItems = transactions
                  .filter(t => t.type === 'sale')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 30);

                if (recentItems.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-4">No recent product sales.</p>;
                }

                return recentItems.map((item, i) => {
                  const dateLabel = formatDateEST(new Date(item.date));
                  return (
                    <div key={item.id || i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{item.productName}</span>
                      </div>
                      <span className="text-muted-foreground mx-2">×{item.quantity}</span>
                      <span className="font-medium w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                      <span className="text-xs text-muted-foreground ml-3 w-28 text-right">{dateLabel}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upgraded Product Performance with dual bars */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Product Performance</CardTitle>
            <CardDescription>Revenue vs Profit by product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={productPerformance.slice(0, 10)} 
                  layout="vertical" 
                  margin={{ left: 120, right: 20, top: 10, bottom: 10 }}
                  barCategoryGap="15%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    width={110}
                    tickFormatter={formatLabel}
                  />
                  <Tooltip content={<DualBarTooltip />} />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#AECCC6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#9CB380" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Sales by Category</CardTitle>
            <CardDescription>Revenue distribution by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <MetricsPieChart 
                data={categoryData}
                tooltipType="currency"
                tooltipLabel="Revenue"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Product Profitability */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Product Profitability</CardTitle>
            <CardDescription>Detailed product sales and profit analysis</CardDescription>
          </div>
          <Button 
            className="bg-spa-deep text-white" 
            onClick={exportCSV}
            disabled={isExporting}
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
            data={productPerformance.map(item => ({
              ...item,
              profitMargin: item.totalRevenue > 0 ? (item.profit / item.totalRevenue) * 100 : 0
            }))}
            columns={productColumns}
            maxHeight="320px"
            emptyMessage="No product sales data available."
          />
        </CardContent>
      </Card>

      {/* Cash Metrics Viewer */}
      <CashMetricsViewer sales={sales} serviceIncomes={serviceIncomes} />
    </div>
  );
};

export default ProductMetrics;
