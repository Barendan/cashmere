import React, { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package2, Award } from "lucide-react";
import usePageTitle from "@/hooks/usePageTitle";
import ProductMetrics from "@/components/metrics/ProductMetrics";
import ServiceMetrics from "@/components/metrics/ServiceMetrics";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ServiceIncomeWithCategory {
  id: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  date: Date;
  customerName: string | null;
  category?: string;
}

interface ParsedServiceCategory {
  serviceIds?: string[];
  serviceNames?: string[];
  servicePrices?: number[];
  discount?: number;
}

interface ServiceMetric {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  customers: Set<string>;
}

const Metrics = () => {
  usePageTitle("Business Metrics");
  const { products, transactions, sales, serviceIncomes, isLoading } = useData();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "monthly">("7days");
  const [metricView, setMetricView] = useState<"products" | "services">("products");

  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const salesTransactions = useMemo(() => {
    return transactions.filter(t => t.type === "sale");
  }, [transactions]);

  const currentMonthTransactions = useMemo(() => {
    return salesTransactions.filter(t => new Date(t.date) >= startOfMonth);
  }, [salesTransactions, startOfMonth]);

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

  const salesData = useMemo(() => {
    const filteredSales = sales.filter(sale => {
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
    
    return Array.from(salesByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  const servicesData = useMemo(() => {
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
    }) as ServiceIncomeWithCategory[];
    
    const serviceMap = new Map<string, ServiceMetric>();
    
    filteredServiceIncomes.forEach(income => {
      if (income.category) {
        try {
          const parsedCategory = JSON.parse(income.category) as ParsedServiceCategory;
          
          if (parsedCategory.serviceIds && Array.isArray(parsedCategory.serviceIds) &&
              parsedCategory.serviceNames && Array.isArray(parsedCategory.serviceNames) &&
              parsedCategory.servicePrices && Array.isArray(parsedCategory.servicePrices)) {
            
            const totalPriceBeforeDiscount = parsedCategory.servicePrices.reduce((sum, price) => sum + price, 0);
            const totalDiscount = parsedCategory.discount || 0;
            
            parsedCategory.serviceIds.forEach((serviceId, index) => {
              const serviceName = parsedCategory.serviceNames?.[index] || "Unknown Service";
              const servicePrice = parsedCategory.servicePrices?.[index] || 0;
              
              const serviceDiscount = totalPriceBeforeDiscount > 0 
                ? (servicePrice / totalPriceBeforeDiscount) * totalDiscount 
                : 0;
                
              const finalPrice = Math.max(0, servicePrice - serviceDiscount);
              
              updateServiceMap(
                serviceMap, 
                serviceId, 
                serviceName, 
                finalPrice, 
                income.customerName
              );
            });
          } else {
            processRegularService(income, serviceMap);
          }
        } catch (e) {
          console.error("Error parsing service details:", e);
          processRegularService(income, serviceMap);
        }
      } else {
        processRegularService(income, serviceMap);
      }
    });
    
    return Array.from(serviceMap.values())
      .map(service => ({
        ...service,
        uniqueCustomers: service.customers.size,
        customers: undefined
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [serviceIncomes, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  function processRegularService(income: ServiceIncomeWithCategory, serviceMap: Map<string, ServiceMetric>) {
    const serviceId = income.serviceId || "unknown";
    const serviceName = income.serviceName || "Unknown Service";
    
    updateServiceMap(
      serviceMap,
      serviceId,
      serviceName,
      income.amount,
      income.customerName
    );
  }

  function updateServiceMap(
    serviceMap: Map<string, ServiceMetric>,
    serviceId: string,
    serviceName: string,
    amount: number,
    customerName: string | null
  ) {
    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, {
        id: serviceId,
        name: serviceName,
        totalSold: 0,
        totalRevenue: 0,
        customers: new Set<string>()
      });
    }
    
    const service = serviceMap.get(serviceId)!;
    service.totalSold += 1;
    service.totalRevenue += amount;
    
    if (customerName) {
      service.customers.add(customerName);
    }
  }

  const uniqueCustomers = useMemo(() => {
    const customers = new Set();
    
    const currentMonthServiceIncomes = serviceIncomes.filter(income => 
      new Date(income.date) >= startOfMonth
    );
    
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
    const allCustomers = new Set<string>();
    
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
    return servicesData.map(service => ({
      name: service.name,
      value: service.totalRevenue
    }));
  }, [servicesData]);

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
    <div className="w-full space-y-6 min-w-[90vw] xl:min-w-[60vw] px-6">
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
