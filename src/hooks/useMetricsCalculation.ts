
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
  const { startOfMonth, sevenDaysAgo, thirtyDaysAgo } = dateRanges;
  
  // Log date ranges for debugging
  console.log("Date ranges:", {
    startOfMonth: startOfMonth.toISOString(),
    sevenDaysAgo: sevenDaysAgo.toISOString(),
    thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    timeRange
  });

  const salesTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByType(transactions, "sale");
    console.log(`Filtered ${filtered.length} sales transactions from ${transactions.length} total`);
    return filtered;
  }, [transactions]);
  
  const currentMonthTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByDateRange(salesTransactions, startOfMonth);
    console.log(`Found ${filtered.length} transactions in current month`);
    return filtered;
  }, [salesTransactions, startOfMonth]);

  const productPerformance = useMemo(() => {
    const performance = metricsUtils.calculateProductPerformance(salesTransactions, products);
    console.log(`Calculated performance for ${performance.length} products`);
    return performance;
  }, [salesTransactions, products]);

  const salesData = useMemo(() => {
    const data = metricsUtils.calculateSalesData(sales, timeRange, { sevenDaysAgo, thirtyDaysAgo });
    console.log(`Generated sales data with ${data.length} data points`);
    return data;
  }, [sales, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  const categoryData = useMemo(() => {
    const data = metricsUtils.calculateProductCategories(salesTransactions, products);
    console.log(`Found ${data.length} product categories`);
    return data;
  }, [salesTransactions, products]);

  const { totalRevenue, totalItemsSold, totalProfit } = useMemo(() => {
    const metrics = metricsUtils.calculateTotalMetrics(currentMonthTransactions, products);
    console.log("Product totals:", metrics);
    return metrics;
  }, [currentMonthTransactions, products]);

  return {
    productPerformance,
    salesData,
    categoryData,
    totalRevenue,
    totalItemsSold,
    totalProfit
  };
};

export const useServiceMetricsCalculation = (
  serviceIncomes: ServiceIncomeWithCategory[],
  timeRange: TimeRangeType
) => {
  const dateRanges = useMemo(() => metricsUtils.getDateRanges(), []);
  const { sevenDaysAgo, thirtyDaysAgo, startOfMonth } = dateRanges;

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

  const totalServiceRevenue = useMemo(() => {
    const total = servicesData.reduce((sum, s) => sum + s.totalRevenue, 0);
    console.log("Total service revenue:", total);
    return total;
  }, [servicesData]);
  
  const totalServicesProvided = useMemo(() => {
    const total = servicesData.reduce((sum, s) => sum + s.totalSold, 0);
    console.log("Total services provided:", total);
    return total;
  }, [servicesData]);
  
  const totalUniqueCustomers = useMemo(() => {
    const customers = new Set();
    servicesData.forEach(service => {
      service.customers?.forEach((c: string) => customers.add(c));
    });
    console.log("Total unique customers:", customers.size);
    return customers.size;
  }, [servicesData]);

  return {
    servicesData,
    serviceTypeData,
    totalServiceRevenue,
    totalServicesProvided,
    totalUniqueCustomers
  };
};

export default { useProductMetricsCalculation, useServiceMetricsCalculation };
