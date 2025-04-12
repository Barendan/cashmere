
import React, { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package2, Award } from "lucide-react";
import usePageTitle from "@/hooks/usePageTitle";
import ProductMetrics from "@/components/metrics/ProductMetrics";
import ServiceMetrics from "@/components/metrics/ServiceMetrics";

const Metrics = () => {
  usePageTitle("Business Metrics");
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

  // Filter transactions
  const salesTransactions = useMemo(() => {
    return transactions.filter(t => t.type === "sale");
  }, [transactions]);

  // Filter transactions for current month only
  const currentMonthTransactions = useMemo(() => {
    return salesTransactions.filter(t => new Date(t.date) >= startOfMonth);
  }, [salesTransactions, startOfMonth]);

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

  // Count unique customers
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

  // Calculate aggregated metrics
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
  
  // Prepare category data for pie chart
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

  // Prepare service type data for pie chart
  const serviceTypeData = useMemo(() => {
    // Map services by name and their revenue
    return servicesData.map(service => ({
      name: service.name,
      value: service.totalRevenue
    }));
  }, [servicesData]);

  // Export data to CSV
  const exportCSV = () => {
    const dataToExport = metricView === "products" ? productPerformance : servicesData;
    const filename = metricView === "products" ? "product-performance" : "service-performance";
    
    let csv = metricView === "products" 
      ? 'Product Name,Total Sold,Total Revenue,Cost Price,Profit\n'
      : 'Service Name,Total Sold,Total Revenue,Unique Customers\n';
    
    dataToExport.forEach(item => {
      if (metricView === "products") {
        csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.costPrice.toFixed(2)},${item.profit.toFixed(2)}\n`;
      } else {
        csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.uniqueCustomers || 0}\n`;
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

      {metricView === "products" ? (
        <ProductMetrics 
          totalRevenue={totalRevenue}
          totalProfit={totalProfit}
          totalItemsSold={totalItemsSold}
          salesData={salesData}
          productPerformance={productPerformance}
          categoryData={categoryData}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          exportCSV={exportCSV}
        />
      ) : (
        <ServiceMetrics 
          totalServiceRevenue={totalServiceRevenue}
          totalUniqueCustomers={totalUniqueCustomers}
          totalServicesProvided={totalServicesProvided}
          servicesData={servicesData}
          serviceTypeData={serviceTypeData}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          exportCSV={exportCSV}
        />
      )}
    </div>
  );
};

export default Metrics;
