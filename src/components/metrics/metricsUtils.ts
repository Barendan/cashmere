
import { Transaction, Product, Sale } from "@/models/types";
import { ServiceIncomeWithCategory, ServiceMetric, ProductMetric, SalesDataPoint, CategoryDataPoint, ParsedServiceCategory } from "./types";

const toLocalDateKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getDateRanges = () => {
  // Use consistent UTC timezone for all date calculations
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sixWeeksAgo = new Date(today);
  sixWeeksAgo.setDate(today.getDate() - 42);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Create UTC-aware dates for today and yesterday
  const nowUTC = new Date();
  
  // Start of today in UTC
  const startOfToday = new Date(nowUTC.getFullYear(), nowUTC.getMonth(), nowUTC.getDate());
  
  // Start and end of yesterday in UTC
  const startOfYesterday = new Date(nowUTC);
  startOfYesterday.setDate(nowUTC.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  
  const endOfYesterday = new Date(nowUTC);
  endOfYesterday.setDate(nowUTC.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  return {
    today,
    sevenDaysAgo,
    sixWeeksAgo,
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

const generateDateRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (current <= endNorm) {
    dates.push(toLocalDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const generateMonthRange = (start: Date, end: Date): string[] => {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= endMonth) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};

const getWeekMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toWeekKey = (d: Date): string => {
  const monday = getWeekMonday(d);
  return toLocalDateKey(monday);
};

const weekKeyToLabel = (weekKey: string): string => {
  const monday = new Date(weekKey + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)}–${fmt(sunday)}`;
};

const generateWeekRange = (start: Date, end: Date): string[] => {
  const weeks: string[] = [];
  const current = getWeekMonday(start);
  const endMonday = getWeekMonday(end);
  while (current <= endMonday) {
    weeks.push(toLocalDateKey(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

export const calculateSalesDataFromTransactions = (
  salesTransactions: Transaction[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, sixWeeksAgo: Date }
): SalesDataPoint[] => {
  const today = new Date();
  const filteredTransactions = salesTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    
    switch(timeRange) {
      case "daily":
        return transactionDate >= dateRanges.sevenDaysAgo;
      case "weekly":
        return transactionDate >= dateRanges.sixWeeksAgo;
      case "monthly":
        return true;
      default:
        return true;
    }
  });
  
  const salesByDate = new Map<string, SalesDataPoint>();
  
  filteredTransactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    let dateStr: string;
    let displayDate: string;

    if (timeRange === "monthly") {
      dateStr = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      displayDate = transactionDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    } else if (timeRange === "weekly") {
      dateStr = toWeekKey(transactionDate);
      displayDate = weekKeyToLabel(dateStr);
    } else {
      dateStr = toLocalDateKey(transactionDate);
      displayDate = dateStr;
    }
    
    if (!salesByDate.has(dateStr)) {
      salesByDate.set(dateStr, { date: displayDate, revenue: 0 });
    }
    
    salesByDate.get(dateStr)!.revenue += transaction.price;
  });

  // Backfill missing buckets with zero
  let allKeys: string[];
  if (timeRange === "monthly") {
    if (filteredTransactions.length === 0) return [];
    const earliest = new Date(Math.min(...filteredTransactions.map(t => new Date(t.date).getTime())));
    allKeys = generateMonthRange(earliest, today);
    allKeys.forEach(k => {
      if (!salesByDate.has(k)) {
        const [y, m] = k.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        salesByDate.set(k, { date: d.toLocaleString('default', { month: 'short', year: 'numeric' }), revenue: 0 });
      }
    });
  } else if (timeRange === "weekly") {
    allKeys = generateWeekRange(dateRanges.sixWeeksAgo, today);
    allKeys.forEach(k => {
      if (!salesByDate.has(k)) {
        salesByDate.set(k, { date: weekKeyToLabel(k), revenue: 0 });
      }
    });
  } else {
    allKeys = generateDateRange(dateRanges.sevenDaysAgo, today);
    allKeys.forEach(k => {
      if (!salesByDate.has(k)) {
        salesByDate.set(k, { date: k, revenue: 0 });
      }
    });
  }

  return allKeys.map(k => salesByDate.get(k)!);
};

export const calculateItemsSoldData = (
  salesTransactions: Transaction[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, sixWeeksAgo: Date }
): SalesDataPoint[] => {
  const today = new Date();
  const filteredTransactions = salesTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    switch(timeRange) {
      case "daily": return transactionDate >= dateRanges.sevenDaysAgo;
      case "weekly": return transactionDate >= dateRanges.sixWeeksAgo;
      case "monthly": return true;
      default: return true;
    }
  });

  const soldByDate = new Map<string, { date: string; revenue: number }>();
  filteredTransactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    let dateStr: string;
    let displayDate: string;

    if (timeRange === "monthly") {
      dateStr = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      displayDate = transactionDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    } else if (timeRange === "weekly") {
      dateStr = toWeekKey(transactionDate);
      displayDate = weekKeyToLabel(dateStr);
    } else {
      dateStr = toLocalDateKey(transactionDate);
      displayDate = dateStr;
    }

    if (!soldByDate.has(dateStr)) {
      soldByDate.set(dateStr, { date: displayDate, revenue: 0 });
    }
    soldByDate.get(dateStr)!.revenue += transaction.quantity;
  });

  // Backfill missing buckets with zero
  let allKeys: string[];
  if (timeRange === "monthly") {
    if (filteredTransactions.length === 0) return [];
    const earliest = new Date(Math.min(...filteredTransactions.map(t => new Date(t.date).getTime())));
    allKeys = generateMonthRange(earliest, today);
    allKeys.forEach(k => {
      if (!soldByDate.has(k)) {
        const [y, m] = k.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        soldByDate.set(k, { date: d.toLocaleString('default', { month: 'short', year: 'numeric' }), revenue: 0 });
      }
    });
  } else if (timeRange === "weekly") {
    allKeys = generateWeekRange(dateRanges.sixWeeksAgo, today);
    allKeys.forEach(k => {
      if (!soldByDate.has(k)) {
        soldByDate.set(k, { date: weekKeyToLabel(k), revenue: 0 });
      }
    });
  } else {
    allKeys = generateDateRange(dateRanges.sevenDaysAgo, today);
    allKeys.forEach(k => {
      if (!soldByDate.has(k)) {
        soldByDate.set(k, { date: k, revenue: 0 });
      }
    });
  }

  return allKeys.map(k => soldByDate.get(k)!);
};

export const calculateSalesData = (
  sales: any[],
  timeRange: string,
  dateRanges: { sevenDaysAgo: Date, thirtyDaysAgo: Date }
): SalesDataPoint[] => {
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    
    switch(timeRange) {
      case "daily":
        return saleDate >= dateRanges.sevenDaysAgo;
      case "weekly":
        return saleDate >= dateRanges.sixWeeksAgo;
      case "monthly":
        return true;
      default:
        return true;
    }
  });
  
  if (filteredSales.length === 0) {
    return [];
  }
  
  const salesByDate = new Map();
  
  filteredSales.forEach(sale => {
    // Ensure consistent date formatting in EST
    const saleDate = new Date(sale.date);
    const dateStr = toLocalDateKey(saleDate);
    
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
      case "daily": return true;
      default: return true;
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
        console.error('Error parsing service category JSON:', e, income);
        processRegularService(income, serviceMap);
      }
    } else {
      processRegularService(income, serviceMap);
    }
  });

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

export const calculateCashIncome = (
  sales: Sale[],
  serviceIncomes: ServiceIncomeWithCategory[],
  startDate: Date,
  endDate?: Date
): number => {
  let totalCash = 0;

  // Calculate cash from product sales (unchanged)
  const cashSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    const inDateRange = endDate 
      ? saleDate >= startDate && saleDate <= endDate
      : saleDate >= startDate;
    return sale.paymentMethod === 'cash' && inDateRange;
  });

  cashSales.forEach(sale => {
    totalCash += sale.totalAmount;
  });

  // Calculate cash from service incomes
  // Filter by date range first
  const serviceIncomesInRange = serviceIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    const inDateRange = endDate
      ? incomeDate >= startDate && incomeDate <= endDate
      : incomeDate >= startDate;
    return inDateRange;
  });

  // Track which transactions we've already counted (for grouped transactions)
  // For grouped transactions, multiple service income records share the same financeTransactionId and cashAmount
  const countedTransactions = new Set<string>();

  serviceIncomesInRange.forEach(income => {
    // For grouped transactions (has financeTransactionId), count cashAmount only once per transaction
    if (income.financeTransactionId && income.cashAmount && income.cashAmount > 0) {
      if (!countedTransactions.has(income.financeTransactionId)) {
        totalCash += income.cashAmount;
        countedTransactions.add(income.financeTransactionId);
      }
    } 
    // For legacy records (no financeTransactionId), use old logic
    else if (income.paymentMethod === 'cash') {
      totalCash += income.amount;
    }
  });

  return totalCash;
};

export const getLast30DaysRange = (): { startDate: Date; endDate: Date } => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29); // 30 days including today
  startDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

export const calculateWeeklyCashIncome = (
  sales: Sale[],
  serviceIncomes: ServiceIncomeWithCategory[],
  numberOfWeeks: number = 5
): Array<{ weekLabel: string; startDate: Date; endDate: Date; cash: number }> => {
  const weeks: Array<{ weekLabel: string; startDate: Date; endDate: Date; cash: number }> = [];
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday = 0
  
  // Calculate the start of the current week (Monday)
  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - daysFromMonday);
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStart = new Date(startOfCurrentWeek);
    weekStart.setDate(startOfCurrentWeek.getDate() - (i * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Calculate cash for this week
    const weekCash = calculateCashIncome(sales, serviceIncomes, weekStart, weekEnd);
    
    // Format week label
    let weekLabel: string;
    if (i === 0) {
      weekLabel = "This Week";
    } else if (i === 1) {
      weekLabel = "Last Week";
    } else {
      const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weekLabel = `${startStr} - ${endStr}`;
    }
    
    weeks.push({
      weekLabel,
      startDate: weekStart,
      endDate: weekEnd,
      cash: weekCash
    });
  }
  
  // Reverse to show oldest first
  return weeks.reverse();
};

export const calculateMonthlyCashIncome = (
  sales: Sale[],
  serviceIncomes: ServiceIncomeWithCategory[],
  numberOfMonths: number = 12
): Array<{ monthLabel: string; startDate: Date; endDate: Date; cash: number }> => {
  const months: Array<{ monthLabel: string; startDate: Date; endDate: Date; cash: number }> = [];
  const today = new Date();
  
  for (let i = 0; i < numberOfMonths; i++) {
    const targetMonth = today.getMonth() - i;
    const targetYear = today.getFullYear();
    
    // Calculate the actual year and month accounting for negative months
    let actualYear = targetYear;
    let actualMonth = targetMonth;
    
    while (actualMonth < 0) {
      actualMonth += 12;
      actualYear -= 1;
    }
    
    // Start of month
    const startDate = new Date(actualYear, actualMonth, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // End of month (last day)
    const endDate = new Date(actualYear, actualMonth + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Calculate cash for this month
    const monthCash = calculateCashIncome(sales, serviceIncomes, startDate, endDate);
    
    // Format month label
    let monthLabel: string;
    if (i === 0) {
      monthLabel = "This Month";
    } else if (i === 1) {
      monthLabel = "Last Month";
    } else {
      monthLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    months.push({
      monthLabel,
      startDate,
      endDate,
      cash: monthCash
    });
  }
  
  // Reverse to show oldest first
  return months.reverse();
};

export const calculateDailyCashIncome = (
  sales: Sale[],
  serviceIncomes: ServiceIncomeWithCategory[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; cash: number }> => {
  const dailyCashMap = new Map<string, number>();
  
  // Initialize all days in range with 0
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = toLocalDateKey(currentDate);
    dailyCashMap.set(dateStr, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate cash from product sales
  const cashSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    return sale.paymentMethod === 'cash' && saleDate >= startDate && saleDate <= endDate;
  });
  
  cashSales.forEach(sale => {
    const saleDate = new Date(sale.date);
    const dateStr = toLocalDateKey(saleDate);
    const currentCash = dailyCashMap.get(dateStr) || 0;
    dailyCashMap.set(dateStr, currentCash + sale.totalAmount);
  });
  
  // Calculate cash from service incomes
  // Filter by date range first
  const serviceIncomesInRange = serviceIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    return incomeDate >= startDate && incomeDate <= endDate;
  });

  // Track which transactions we've already counted per day (for grouped transactions)
  const countedTransactionsByDay = new Map<string, Set<string>>();

  serviceIncomesInRange.forEach(income => {
    const incomeDate = new Date(income.date);
    const dateStr = toLocalDateKey(incomeDate);
    const currentCash = dailyCashMap.get(dateStr) || 0;

    // For grouped transactions (has financeTransactionId), count cashAmount only once per transaction per day
    if (income.financeTransactionId && income.cashAmount && income.cashAmount > 0) {
      if (!countedTransactionsByDay.has(dateStr)) {
        countedTransactionsByDay.set(dateStr, new Set());
      }
      const dayCountedSet = countedTransactionsByDay.get(dateStr)!;
      
      if (!dayCountedSet.has(income.financeTransactionId)) {
        dailyCashMap.set(dateStr, currentCash + income.cashAmount);
        dayCountedSet.add(income.financeTransactionId);
      }
    } 
    // For legacy records (no financeTransactionId), use old logic
    else if (income.paymentMethod === 'cash') {
      dailyCashMap.set(dateStr, currentCash + income.amount);
    }
  });
  
  // Convert to array and sort by date
  return Array.from(dailyCashMap.entries())
    .map(([date, cash]) => ({ date, cash }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
