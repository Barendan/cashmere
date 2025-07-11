import { Transaction, Product } from "@/models/types";
import { ServiceIncomeWithCategory, ServiceMetric, ProductMetric, SalesDataPoint, CategoryDataPoint, ParsedServiceCategory } from "./types";

export const getDateRanges = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Add daily date ranges
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(today);
  startOfYesterday.setDate(today.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(today);
  endOfYesterday.setDate(today.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  return {
    today,
    sevenDaysAgo,
    thirtyDaysAgo,
    startOfMonth,
    startOfToday,
    startOfYesterday,
    endOfYesterday
  };
};

export const filterTransactionsByType = (
  transactions: Transaction[],
  type: string
): Transaction[] => {
  return transactions.filter(t => t.type === type);
};

export const filterTransactionsByDateRange = (
  transactions: Transaction[],
  startDate: Date,
  endDate?: Date
): Transaction[] => {
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    if (endDate) {
      return transactionDate >= startDate && transactionDate <= endDate;
    }
    return transactionDate >= startDate;
  });
};

export const filterTransactionsByDayRange = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] => {
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
};

export const calculateProductPerformance = (
  salesTransactions: Transaction[],
  products: Product[]
): ProductMetric[] => {
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
    .sort((a: ProductMetric, b: ProductMetric) => b.profit - a.profit);
};

export const calculateSalesData = (
  sales: any[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, thirtyDaysAgo: Date }
): SalesDataPoint[] => {
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    
    switch(timeRange) {
      case "7days":
        return saleDate >= dateRanges.sevenDaysAgo;
      case "30days":
        return saleDate >= dateRanges.thirtyDaysAgo;
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
};

export const calculateProductCategories = (
  salesTransactions: Transaction[],
  products: Product[]
): CategoryDataPoint[] => {
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
};

export const filterServiceIncomesByDayRange = (
  serviceIncomes: ServiceIncomeWithCategory[],
  startDate: Date,
  endDate: Date
): ServiceIncomeWithCategory[] => {
  return serviceIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    return incomeDate >= startDate && incomeDate <= endDate;
  });
};

export const calculateServicesData = (
  serviceIncomes: ServiceIncomeWithCategory[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, thirtyDaysAgo: Date }
): ServiceMetric[] => {
  const filteredServiceIncomes = serviceIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    switch (timeRange) {
      case "7days": return incomeDate >= dateRanges.sevenDaysAgo;
      case "30days": return incomeDate >= dateRanges.thirtyDaysAgo;
      case "monthly": return true;
      default: return false;
    }
  });

  const serviceMap = new Map();

  filteredServiceIncomes.forEach(income => {
    const category = income.category;
    
    if (category) {
      try {
        const parsed = JSON.parse(category) as ParsedServiceCategory;
        
        if (
          Array.isArray(parsed.serviceIds) &&
          Array.isArray(parsed.serviceNames) &&
          Array.isArray(parsed.servicePrices)
        ) {
          // Handle bundled/multi-service with discount
          const totalBeforeDiscount = parsed.servicePrices.reduce((s, v) => s + v, 0);
          const discount = parsed.discount || 0;
          
          parsed.serviceIds.forEach((id: string, idx: number) => {
            const name = parsed.serviceNames?.[idx] || "Unknown Service";
            const price = parsed.servicePrices?.[idx] || 0;
            const allocation = totalBeforeDiscount ? (price / totalBeforeDiscount) * discount : 0;
            const netPrice = Math.max(0, price - allocation);

            if (!serviceMap.has(id)) {
              serviceMap.set(id, {
                id,
                name,
                totalSold: 0,
                totalRevenue: 0,
                customers: new Set()
              });
            }
            
            const entry = serviceMap.get(id);
            entry.totalSold += 1;
            entry.totalRevenue += netPrice;
            
            if (income.customerName) {
              entry.customers.add(income.customerName);
            }
          });
        } else {
          processRegularService(income, serviceMap);
        }
      } catch (e) {
        processRegularService(income, serviceMap);
      }
    } else {
      processRegularService(income, serviceMap);
    }
  });

  // Transform for table/chart/pie components
  return Array.from(serviceMap.values())
    .map(item => ({
      ...item,
      uniqueCustomers: item.customers.size
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
};

const processRegularService = (
  income: ServiceIncomeWithCategory, 
  serviceMap: Map<string, ServiceMetric>
) => {
  const id = income.serviceId || "unknown";
  const name = income.serviceName || "Unknown Service";
  
  if (!serviceMap.has(id)) {
    serviceMap.set(id, {
      id,
      name,
      totalSold: 0,
      totalRevenue: 0,
      customers: new Set()
    });
  }
  
  const entry = serviceMap.get(id);
  entry.totalSold += 1;
  entry.totalRevenue += income.amount;
  
  if (income.customerName) {
    entry.customers.add(income.customerName);
  }
};

export const calculateServiceTypeData = (
  servicesData: ServiceMetric[]
): CategoryDataPoint[] => {
  return servicesData.map(s => ({
    name: s.name,
    value: s.totalRevenue
  }));
};

export const calculateUniqueCustomers = (
  serviceIncomes: ServiceIncomeWithCategory[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, thirtyDaysAgo: Date, startOfMonth: Date }
): number => {
  const customers = new Set();

  const filteredServiceIncomes = serviceIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    
    switch(timeRange) {
      case "7days":
        return incomeDate >= dateRanges.sevenDaysAgo;
      case "30days":
        return incomeDate >= dateRanges.thirtyDaysAgo;
      case "monthly":
        return incomeDate >= dateRanges.startOfMonth;
      default:
        return false;
    }
  });
  
  filteredServiceIncomes.forEach(income => {
    if (income.customerName) {
      customers.add(income.customerName);
    }
  });
  
  return customers.size;
};

export const calculateTotalMetrics = (
  transactions: Transaction[],
  products: Product[]
) => {
  let totalRevenue = 0;
  let totalItemsSold = 0;
  let totalProfit = 0;

  transactions.forEach(sale => {
    totalRevenue += sale.price;
    totalItemsSold += sale.quantity;
    
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      totalProfit += sale.price - (product.costPrice * sale.quantity);
    }
  });

  return {
    totalRevenue,
    totalItemsSold,
    totalProfit
  };
};

export const generateCsvData = (
  dataToExport: any[],
  isProducts: boolean
): string => {
  let csv = isProducts ?
    'Product Name,Total Sold,Total Revenue,Cost Price,Profit\n'
    : 'Service Name,Total Sold,Total Revenue,Unique Customers\n';
  
  dataToExport.forEach(item => {
    if (isProducts) {
      csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.costPrice.toFixed(2)},${item.profit.toFixed(2)}\n`;
    } else {
      csv += `"${item.name}",${item.totalSold},${item.totalRevenue.toFixed(2)},${item.uniqueCustomers || 0}\n`;
    }
  });
  
  return csv;
};

export const exportToCsv = (
  dataToExport: any[],
  isProducts: boolean
): void => {
  const filename = isProducts ? "product-performance" : "service-performance";
  const csv = generateCsvData(dataToExport, isProducts);
  
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
