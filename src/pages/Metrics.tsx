import React, { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Calendar, DollarSign, ArrowUp, ShoppingBag, Loader2, Package2, Award, Users } from "lucide-react";

const Metrics = () => {
  const { products, transactions, sales, serviceIncomes, isLoading } = useData();
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "monthly">("7days");
  const [metricView, setMetricView] = useState<"products" | "services">("products");

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Start of the current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const salesTransactions = useMemo(() => {
    return transactions.filter(t => t.type === "sale");
  }, [transactions]);

  // Filter transactions for current month only
  const currentMonthTransactions = useMemo(() => {
    return salesTransactions.filter(t => new Date(t.date) >= startOfMonth);
  }, [salesTransactions, startOfMonth]);

  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today);

  // Define productPerformance
  const productPerformance = useMemo(() => {
    const productMap = new Map();
    
    salesTransactions.forEach(transaction => {
      const productId = transaction.productId;
      const product = products.find(p => p.id === productId);
      
      if (product) {
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: productId,
            name: product.name,
            totalSold: 0,
            totalRevenue: 0,
            costPrice: product.costPrice,
            profit: 0
          });
        }
        
        const productData = productMap.get(productId);
        productData.totalSold += transaction.quantity;
        productData.totalRevenue += transaction.price;
        productData.profit += transaction.price - (product.costPrice * transaction.quantity);
      }
    });
    
    return Array.from(productMap.values())
      .sort((a, b) => b.profit - a.profit);
  }, [salesTransactions, products]);

  // Define salesData
  const salesData = useMemo(() => {
    // Filter sales based on selected time range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      
      switch(timeRange) {
        case "7days":
          return saleDate >= sevenDaysAgo;
        case "30days":
          return saleDate >= thirtyDaysAgo;
        case "monthly":
          return true; // Show all for monthly view
        default:
          return false;
      }
    });
    
    // Group sales by date
    const salesByDate = new Map();
    
    filteredSales.forEach(sale => {
      const dateStr = new Date(sale.date).toISOString().split('T')[0];
      
      if (!salesByDate.has(dateStr)) {
        salesByDate.set(dateStr, {
          date: dateStr,
          revenue: 0
        });
      }
      
      salesByDate.get(dateStr).revenue += sale.totalAmount;
    });
    
    // Convert to array and sort by date
    return Array.from(salesByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  // Now using serviceIncomes from the finance data instead of filtered product transactions
  const servicesData = useMemo(() => {
    // Filter service incomes for the selected time range
    const filteredServiceIncomes = serviceIncomes.filter(income => {
      const incomeDate = new Date(income.date);
      
      switch(timeRange) {
        case "7days":
          return incomeDate >= sevenDaysAgo;
        case "30days":
          return incomeDate >= thirtyDaysAgo;
        case "monthly":
          return true; // Show all for monthly view
        default:
          return false;
      }
    });
    
    // Group service incomes by service ID and map to the required format
    const serviceMap = new Map();
    
    filteredServiceIncomes.forEach(income => {
      const serviceId = income.serviceId;
      
      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          id: serviceId,
          name: income.serviceName,
          totalSold: 0,
          totalRevenue: 0,
          customers: new Set()
        });
      }
      
      const service = serviceMap.get(serviceId);
      service.totalSold += 1;
      service.totalRevenue += income.amount;
      if (income.customerName) {
        service.customers.add(income.customerName);
      }
    });
    
    // Convert the map to an array and format for display
    return Array.from(serviceMap.values())
      .map(service => ({
        ...service,
        uniqueCustomers: service.customers.size,
        customers: undefined // Remove the Set from the final object
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [serviceIncomes, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  // Count unique customers per month
  const uniqueCustomers = useMemo(() => {
    const customers = new Set();
    
    // Filter service incomes from current month
    const currentMonthServiceIncomes = serviceIncomes.filter(income => 
      new Date(income.date) >= startOfMonth
    );
    
    // Add each customer name to the Set (which automatically handles uniqueness)
    currentMonthServiceIncomes.forEach(income => {
      if (income.customerName) {
        customers.add(income.customerName);
      }
    });
    
    return customers.size;
  }, [serviceIncomes, startOfMonth]);

  const totalRevenue = useMemo(() => 
    currentMonthTransactions.reduce((sum, t) => sum + t.price, 0),
    [currentMonthTransactions]
  );
  
  const totalItemsSold = useMemo(() =>
    currentMonthTransactions.reduce((sum, t) => sum + t.quantity, 0),
    [currentMonthTransactions]
  );
  
  const totalProfit = useMemo(() => {
    let profit = 0;
    currentMonthTransactions.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        profit += sale.price - (product.costPrice * sale.quantity);
      }
    });
    return profit;
  }, [currentMonthTransactions, products]);

  const totalServiceRevenue = useMemo(() => 
    servicesData.reduce((sum, service) => sum + service.totalRevenue, 0),
    [servicesData]
  );
  
  const totalServicesProvided = useMemo(() =>
    servicesData.reduce((sum, service) => sum + service.totalSold, 0),
    [servicesData]
  );
  
  const totalUniqueCustomers = useMemo(() => {
    const allCustomers = new Set();
    
    // The time range should match the filters applied to the servicesData
    const filteredServiceIncomes = serviceIncomes.filter(income => {
      const incomeDate = new Date(income.date);
      
      switch(timeRange) {
        case "7days":
          return incomeDate >= sevenDaysAgo;
        case "30days":
          return incomeDate >= thirtyDaysAgo;
        case "monthly":
          return true;
        default:
          return false;
      }
    });
    
    filteredServiceIncomes.forEach(income => {
      if (income.customerName) {
        allCustomers.add(income.customerName);
      }
    });
    
    return allCustomers.size;
  }, [serviceIncomes, timeRange, sevenDaysAgo, thirtyDaysAgo]);
  
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

  const serviceTypeData = useMemo(() => {
    // Map services by name and their revenue
    return servicesData.map(service => ({
      name: service.name,
      value: service.totalRevenue
    }));
  }, [servicesData]);

  const COLORS = ['#AECCC6', '#9CB380', '#A6C0D0', '#D1C6B8', '#E6DFD9', '#7E9A9A'];
  
  const exportCSV = () => {
    const dataToExport = metricView === "products" ? productPerformance : servicesData;
    const filename = metricView === "products" ? "product-performance" : "service-performance";
    
    let csv = metricView === "products" 
      ? 'Product Name,Total Sold,Total Revenue,Cost Price,Profit\n'
      : 'Service Name,Total Sold,Total Revenue,Profit\n';
    
    dataToExport.forEach(item => {
      if (metricView === "products") {
        csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.costPrice.toFixed(2)},${item.profit.toFixed(2)}\n`;
      } else {
        csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.profit.toFixed(2)}\n`;
      }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spa-${filename}-${new Date().toISOString().split('T')[0]}.csv`);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-spa-deep mb-1">Business Metrics</h1>
          <p className="text-muted-foreground">Analyze your business performance</p>
        </div>
        
        <Tabs defaultValue="products" value={metricView} onValueChange={(v) => setMetricView(v as "products" | "services")}>
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-1">
              <Package2 className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              Services
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="products" value={metricView}>
        <TabsContent value="products" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
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
                    <p className="text-sm text-muted-foreground">Monthly Profit</p>
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
                    <p className="text-sm text-muted-foreground">Items Sold This Month</p>
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
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Profit Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <ScrollArea className="max-h-[30vh]">
                  <Table>
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
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Service Revenue</p>
                    <h3 className="text-2xl font-semibold mt-1">${totalServiceRevenue.toFixed(2)}</h3>
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
                    <p className="text-sm text-muted-foreground">Unique Customers</p>
                    <h3 className="text-2xl font-semibold mt-1">{totalUniqueCustomers}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-spa-water/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-spa-deep" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Services Provided</p>
                    <h3 className="text-2xl font-semibold mt-1">{totalServicesProvided}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-spa-stone/20 flex items-center justify-center">
                    <Award className="h-6 w-6 text-spa-deep" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-spa-deep">Service Revenue</CardTitle>
              <CardDescription>Track your service performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={servicesData.slice(0, 10).map(s => ({ name: s.name, revenue: s.totalRevenue }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e6dfd9' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#A6C0D0" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-spa-deep">Service Performance</CardTitle>
                <CardDescription>Revenue analysis by service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={servicesData.slice(0, 6)}
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
                      <Bar dataKey="totalRevenue" name="Revenue" fill="#D1C6B8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-spa-deep">Services by Type</CardTitle>
                <CardDescription>Revenue distribution by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceTypeData}
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
                        {serviceTypeData.map((entry, index) => (
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
                <CardTitle className="text-spa-deep">Service Performance</CardTitle>
                <CardDescription>Detailed service revenue analysis</CardDescription>
              </div>
              <Button className="bg-spa-deep text-white" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-spa-sand">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead className="text-right">Times Provided</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Unique Customers</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <ScrollArea className="max-h-[30vh]">
                  <Table>
                    <TableBody>
                      {servicesData.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-right">{service.totalSold}</TableCell>
                          <TableCell className="text-right">${service.totalRevenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{service.uniqueCustomers || 0}</TableCell>
                        </TableRow>
                      ))}
                      {servicesData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            No service data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Metrics;
