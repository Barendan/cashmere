
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, DollarSign, ArrowUp, ShoppingBag } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import MetricsCard from "./MetricsCard";
import MetricsBarChart from "./MetricsBarChart";
import MetricsPieChart from "./MetricsPieChart";
import DataTable from "./DataTable";

type ProductMetricsProps = {
  totalRevenue: number;
  totalProfit: number;
  totalItemsSold: number;
  salesData: any[];
  productPerformance: any[];
  categoryData: any[];
  timeRange: "7days" | "30days" | "monthly";
  setTimeRange: (range: "7days" | "30days" | "monthly") => void;
  exportCSV: () => void;
};

const ProductMetrics = ({
  totalRevenue,
  totalProfit,
  totalItemsSold,
  salesData,
  productPerformance,
  categoryData,
  timeRange,
  setTimeRange,
  exportCSV
}: ProductMetricsProps) => {
  const productColumns = [
    { key: "name", header: "Product Name", className: "font-medium" },
    { key: "totalSold", header: "Quantity Sold", className: "text-right", formatter: (value) => value },
    { key: "totalRevenue", header: "Revenue", className: "text-right", formatter: (value) => formatCurrency(value) },
    { 
      key: "costPrice", 
      header: "Cost", 
      className: "text-right", 
      formatter: (value, item: any) => formatCurrency(value * item.totalSold)
    },
    { key: "profit", header: "Profit", className: "text-right", formatter: (value) => formatCurrency(value) },
    { 
      key: "profitMargin", 
      header: "Profit Margin", 
      className: "text-right", 
      formatter: (_, item: any) => item.totalRevenue > 0 
        ? formatPercent((item.profit / item.totalRevenue) * 100) 
        : "0%"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricsCard 
          title="Monthly Revenue" 
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="h-6 w-6 text-spa-deep" />}
        />
        
        <MetricsCard 
          title="Monthly Profit" 
          value={formatCurrency(totalProfit)}
          icon={<ArrowUp className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-water/20"
        />
        
        <MetricsCard 
          title="Items Sold This Month" 
          value={totalItemsSold}
          icon={<ShoppingBag className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-stone/20"
        />
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Sales Overview</CardTitle>
            <CardDescription>Track your sales performance</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={timeRange === "7days" ? "default" : "outline"} 
              onClick={() => setTimeRange("7days")}
              className="text-xs"
            >
              Last 7 Days
            </Button>
            <Button 
              variant={timeRange === "30days" ? "default" : "outline"} 
              onClick={() => setTimeRange("30days")}
              className="text-xs"
            >
              Last 30 Days
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
        <CardContent>
          <div className="h-[300px]">
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Product Performance</CardTitle>
            <CardDescription>Profit analysis by product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <MetricsBarChart 
                data={productPerformance.slice(0, 6)}
                dataKey="profit"
                nameKey="name"
                layout="vertical"
                barName="Profit"
                barFill="#9CB380"
                tooltipType="currency"
                tooltipLabel="Profit"
              />
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

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Product Profitability</CardTitle>
            <CardDescription>Detailed product sales and profit analysis</CardDescription>
          </div>
          <Button className="bg-spa-deep text-white" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={productPerformance.map(item => ({
              ...item,
              profitMargin: item.totalRevenue > 0 ? (item.profit / item.totalRevenue) * 100 : 0
            }))}
            columns={productColumns}
            emptyMessage="No product sales data available."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMetrics;
