
import { useMemo } from "react";
import { Transaction, Product } from "@/models/types";
import { TimeRangeType, ServiceIncomeWithCategory } from "@/components/metrics/types";
import * as metricsUtils from "@/components/metrics/metricsUtils";

export const useProductMetricsCalculation = (
  products: Product[],
  transactions: Transaction[],
  sales: any[],
  timeRange: TimeRangeType
) => {
  const dateRanges = useMemo(() => metricsUtils.getDateRanges(), []);
  const { startOfMonth, sevenDaysAgo, thirtyDaysAgo, startOfToday, startOfYesterday, endOfYesterday } = dateRanges;
  
  // Filter out internal-use products from metrics calculations
  const sellableProducts = useMemo(() => {
    return products.filter(product => product.forSale);
  }, [products]);
  
  // Log date ranges for debugging
  console.log("Date ranges:", {
    startOfMonth: startOfMonth.toISOString(),
    sevenDaysAgo: sevenDaysAgo.toISOString(),
    thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    startOfToday: startOfToday.toISOString(),
    startOfYesterday: startOfYesterday.toISOString(),
    endOfYesterday: endOfYesterday.toISOString(),
    timeRange
  });

  const salesTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByType(transactions, "sale");
    // Filter out transactions for internal-use products
    const sellableTransactions = filtered.filter(transaction => {
      const product = sellableProducts.find(p => p.id === transaction.productId);
      return product !== undefined;
    });
    console.log(`Filtered ${sellableTransactions.length} sellable sales transactions from ${filtered.length} total sales transactions`);
    return sellableTransactions;
  }, [transactions, sellableProducts]);
  
  // Today's transactions
  const todayTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByDateRange(salesTransactions, startOfToday);
    console.log(`Found ${filtered.length} transactions for today`);
    return filtered;
  }, [salesTransactions, startOfToday]);

  // Yesterday's transactions
  const yesterdayTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByDayRange(salesTransactions, startOfYesterday, endOfYesterday);
    console.log(`Found ${filtered.length} transactions for yesterday`);
    return filtered;
  }, [salesTransactions, startOfYesterday, endOfYesterday]);

  const productPerformance = useMemo(() => {
    const performance = metricsUtils.calculateProductPerformance(salesTransactions, sellableProducts);
    console.log(`Calculated performance for ${performance.length} sellable products`);
    return performance;
  }, [salesTransactions, sellableProducts]);

  const salesData = useMemo(() => {
    const data = metricsUtils.calculateSalesData(sales, timeRange, { sevenDaysAgo, thirtyDaysAgo });
    console.log(`Generated sales data with ${data.length} data points`);
    return data;
  }, [sales, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  const categoryData = useMemo(() => {
    const data = metricsUtils.calculateProductCategories(salesTransactions, sellableProducts);
    console.log(`Found ${data.length} product categories for sellable products`);
    return data;
  }, [salesTransactions, sellableProducts]);

  // Today's metrics
  const { totalRevenue: todayRevenue, totalItemsSold: todayItemsSold, totalProfit: todayProfit } = useMemo(() => {
    const metrics = metricsUtils.calculateTotalMetrics(todayTransactions, sellableProducts);
    console.log("Today's product totals (sellable only):", metrics);
    return metrics;
  }, [todayTransactions, sellableProducts]);

  // Yesterday's metrics
  const { totalRevenue: yesterdayRevenue, totalItemsSold: yesterdayItemsSold, totalProfit: yesterdayProfit } = useMemo(() => {
    const metrics = metricsUtils.calculateTotalMetrics(yesterdayTransactions, sellableProducts);
    console.log("Yesterday's product totals (sellable only):", metrics);
    return metrics;
  }, [yesterdayTransactions, sellableProducts]);

  return {
    productPerformance,
    salesData,
    categoryData,
    todayRevenue,
    todayItemsSold,
    todayProfit,
    yesterdayRevenue,
    yesterdayItemsSold,
    yesterdayProfit
  };
};

export const useServiceMetricsCalculation = (
  serviceIncomes: ServiceIncomeWithCategory[],
  timeRange: TimeRangeType
) => {
  const dateRanges = useMemo(() => metricsUtils.getDateRanges(), []);
  const { sevenDaysAgo, thirtyDaysAgo, startOfMonth, startOfToday, startOfYesterday, endOfYesterday } = dateRanges;

  // Log service income data for debugging
  console.log(`Processing ${serviceIncomes.length} service income records for metrics`);

  // Today's service incomes
  const todayServiceIncomes = useMemo(() => {
    const filtered = metricsUtils.filterServiceIncomesByDayRange(serviceIncomes, startOfToday, new Date());
    console.log(`Found ${filtered.length} service incomes for today`);
    return filtered;
  }, [serviceIncomes, startOfToday]);

  // Yesterday's service incomes
  const yesterdayServiceIncomes = useMemo(() => {
    const filtered = metricsUtils.filterServiceIncomesByDayRange(serviceIncomes, startOfYesterday, endOfYesterday);
    console.log(`Found ${filtered.length} service incomes for yesterday`);
    return filtered;
  }, [serviceIncomes, startOfYesterday, endOfYesterday]);

  const servicesData = useMemo(() => {
    const data = metricsUtils.calculateServicesData(serviceIncomes, timeRange, { sevenDaysAgo, thirtyDaysAgo });
    console.log(`Calculated metrics for ${data.length} services`);
    return data;
  }, [serviceIncomes, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  const serviceTypeData = useMemo(() => {
    const data = metricsUtils.calculateServiceTypeData(servicesData);
    console.log(`Generated chart data for ${data.length} service types`);
    return data;
  }, [servicesData]);

  // Today's service metrics
  const todayServicesData = useMemo(() => {
    const data = metricsUtils.calculateServicesData(todayServiceIncomes, "daily", { sevenDaysAgo, thirtyDaysAgo });
    return data;
  }, [todayServiceIncomes, sevenDaysAgo, thirtyDaysAgo]);

  const todayServiceRevenue = useMemo(() => {
    const total = todayServicesData.reduce((sum, s) => sum + s.totalRevenue, 0);
    console.log("Today's service revenue:", total);
    return total;
  }, [todayServicesData]);
  
  const todayServicesProvided = useMemo(() => {
    const total = todayServicesData.reduce((sum, s) => sum + s.totalSold, 0);
    console.log("Today's services provided:", total);
    return total;
  }, [todayServicesData]);
  
  const todayUniqueCustomers = useMemo(() => {
    const customers = new Set();
    todayServicesData.forEach(service => {
      service.customers?.forEach((c: string) => customers.add(c));
    });
    console.log("Today's unique customers:", customers.size);
    return customers.size;
  }, [todayServicesData]);

  // Yesterday's service metrics
  const yesterdayServicesData = useMemo(() => {
    const data = metricsUtils.calculateServicesData(yesterdayServiceIncomes, "daily", { sevenDaysAgo, thirtyDaysAgo });
    return data;
  }, [yesterdayServiceIncomes, sevenDaysAgo, thirtyDaysAgo]);

  const yesterdayServiceRevenue = useMemo(() => {
    const total = yesterdayServicesData.reduce((sum, s) => sum + s.totalRevenue, 0);
    console.log("Yesterday's service revenue:", total);
    return total;
  }, [yesterdayServicesData]);
  
  const yesterdayServicesProvided = useMemo(() => {
    const total = yesterdayServicesData.reduce((sum, s) => sum + s.totalSold, 0);
    console.log("Yesterday's services provided:", total);
    return total;
  }, [yesterdayServicesData]);
  
  const yesterdayUniqueCustomers = useMemo(() => {
    const customers = new Set();
    yesterdayServicesData.forEach(service => {
      service.customers?.forEach((c: string) => customers.add(c));
    });
    console.log("Yesterday's unique customers:", customers.size);
    return customers.size;
  }, [yesterdayServicesData]);

  return {
    servicesData,
    serviceTypeData,
    todayServiceRevenue,
    todayServicesProvided,
    todayUniqueCustomers,
    yesterdayServiceRevenue,
    yesterdayServicesProvided,
    yesterdayUniqueCustomers
  };
};

export default { useProductMetricsCalculation, useServiceMetricsCalculation };
