import React, { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Calendar, DollarSign, ArrowUp, ShoppingBag, Loader2 } from "lucide-react";

const Metrics = () => {
  const { products, transactions, isLoading } = useData();
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "monthly">("7days");

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const salesTransactions = useMemo(() => {
    return transactions.filter(t => t.type === "sale");
  }, [transactions]);

  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today);

  const salesData = useMemo(() => {
    const salesByDay = new Map();
    const salesByMonth = new Map();
    
    const filteredSales = salesTransactions.filter(sale => {
      const saleDate = new Date(sale.date);
      
      switch(timeRange) {
        case "7days":
          return saleDate >= sevenDaysAgo;
        case "30days":
          return saleDate >= thirtyDaysAgo;
        case "monthly":
          return true;
        default:
          return false;
      }
    });
    
    if (timeRange === "7days" || timeRange === "30days") {
      filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const dateStr = saleDate.toISOString().split('T')[0];
        
        if (!salesByDay.has(dateStr)) {
          salesByDay.set(dateStr, { date: dateStr, revenue: 0, items: 0 });
        }
        
        const daySales = salesByDay.get(dateStr);
        daySales.revenue += sale.price;
        daySales.items += sale.quantity;
      });
      
      const daysToShow = timeRange === "7days" ? 7 : 30;
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (!salesByDay.has(dateStr)) {
          salesByDay.set(dateStr, { date: dateStr, revenue: 0, items: 0 });
        }
      }
      
      return Array.from(salesByDay.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => ({
          ...day,
          date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
    }
    
    else if (timeRange === "monthly") {
      filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const monthStr = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(saleDate);
        
        if (!salesByMonth.has(monthStr)) {
          salesByMonth.set(monthStr, { date: monthStr, revenue: 0, items: 0 });
        }
        
        const monthSales = salesByMonth.get(monthStr);
        monthSales.revenue += sale.price;
        monthSales.items += sale.quantity;
      });
      
      return Array.from(salesByMonth.values())
        .sort((a, b) => {
          const [aMonth, aYear] = a.date.split(' ');
          const [bMonth, bYear] = b.date.split(' ');
          
          if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
          
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months.indexOf(aMonth) - months.indexOf(bMonth);
        });
    }
    
    return [];
  }, [salesTransactions, timeRange, sevenDaysAgo, thirtyDaysAgo, today]);

  const productPerformance = useMemo(() => {
    const productSales = new Map();
    
    salesTransactions.forEach(sale => {
      if (!productSales.has(sale.productId)) {
        const product = products.find(p => p.id === sale.productId);
        
        if (product) {
          productSales.set(sale.productId, {
            id: sale.productId,
            name: product.name,
            totalSold: 0,
            totalRevenue: 0,
            costPrice: product.costPrice,
            profit: 0
          });
        }
      }
      
      if (productSales.has(sale.productId)) {
        const productData = productSales.get(sale.productId);
        productData.totalSold += sale.quantity;
        productData.totalRevenue += sale.price;
        productData.profit += sale.price - (productData.costPrice * sale.quantity);
      }
    });
    
    return Array.from(productSales.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesTransactions, products]);

  const totalRevenue = useMemo(() => 
    salesTransactions.reduce((sum, t) => sum + t.price, 0),
    [salesTransactions]
  );
  
  const totalItemsSold = useMemo(() =>
    salesTransactions.reduce((sum, t) => sum + t.quantity, 0),
    [salesTransactions]
  );
  
  const totalProfit = useMemo(() => {
    let profit = 0;
    salesTransactions.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        profit += sale.price - (product.costPrice * sale.quantity);
      }
    });
    return profit;
  }, [salesTransactions, products]);
  
  const categoryData = useMemo(() => {
    const categories = new Map();
    
    salesTransactions.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        const category = product.category || "Uncategorized";
        
        if (!categories.has(category)) {
          categories.set(category, {
            name: category,
            value: 0
          });
        }
        
        categories.get(category).value += sale.price;
      }
    });
    
    return Array.from(categories.values());
  }, [salesTransactions, products]);

  const COLORS = ['#AECCC6', '#9CB380', '#A6C0D0', '#D1C6B8', '#E6DFD9', '#7E9A9A'];
  
  const exportCSV = () => {
    let csv = 'Product Name,Total Sold,Total Revenue,Cost Price,Profit\n';
    
    productPerformance.forEach(product => {
      csv += `"${product.name}",${product.totalSold},${product.totalRevenue.toFixed(2)},${product.costPrice.toFixed(2)},${product.profit.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spa-inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center min-w-[90vw]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-spa-deep mx-auto mb-4" />
          <h3 className="text-xl font-medium text-spa-deep">Loading metrics data...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 min-w-[90vw] px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-semibold mt-1">${totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-spa-sage/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-spa-deep" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <h3 className="text-2xl font-semibold mt-1">${totalProfit.toFixed(2)}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-spa-water/20 flex items-center justify-center">
                <ArrowUp className="h-6 w-6 text-spa-deep" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <h3 className="text-2xl font-semibold mt-1">{totalItemsSold}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-spa-stone/20 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-spa-deep" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Sales Overview</CardTitle>
            <CardDescription>Track your sales performance</CardDescription>
          </div>
          <Tabs defaultValue="7days" onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e6dfd9' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#AECCC6" />
              </BarChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productPerformance.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`]}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e6dfd9' }}
                  />
                  <Legend />
                  <Bar dataKey="profit" name="Profit" fill="#9CB380" />
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e6dfd9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
          <div className="rounded-md border border-spa-sand">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPerformance.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.totalSold}</TableCell>
                    <TableCell className="text-right">${product.totalRevenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${(product.costPrice * product.totalSold).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${product.profit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {product.totalRevenue > 0 
                        ? `${((product.profit / product.totalRevenue) * 100).toFixed(1)}%` 
                        : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                {productPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No product sales data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Metrics;
