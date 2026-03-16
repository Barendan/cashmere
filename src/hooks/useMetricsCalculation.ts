
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
  const { startOfMonth, sevenDaysAgo, sixWeeksAgo, startOfToday, startOfYesterday, endOfYesterday } = dateRanges;
  
  // Filter out internal-use products from metrics calculations
  const sellableProducts = useMemo(() => {
    return products.filter(product => product.forSale);
  }, [products]);

  const salesTransactions = useMemo(() => {
    const filtered = metricsUtils.filterTransactionsByType(transactions, "sale");
    const sellableTransactions = filtered.filter(transaction => {
      const product = sellableProducts.find(p => p.id === transaction.productId);
      return product !== undefined;
    });
    return sellableTransactions;
  }, [transactions, sellableProducts]);
  
  const todayTransactions = useMemo(() => {
    return metricsUtils.filterTransactionsByDateRange(salesTransactions, startOfToday);
  }, [salesTransactions, startOfToday]);

  const yesterdayTransactions = useMemo(() => {
    return metricsUtils.filterTransactionsByDayRange(salesTransactions, startOfYesterday, endOfYesterday);
  }, [salesTransactions, startOfYesterday, endOfYesterday]);

  const productPerformance = useMemo(() => {
    return metricsUtils.calculateProductPerformance(salesTransactions, sellableProducts);
  }, [salesTransactions, sellableProducts]);

  const salesData = useMemo(() => {
    return metricsUtils.calculateSalesDataFromTransactions(salesTransactions, timeRange, { sevenDaysAgo, sixWeeksAgo });
  }, [salesTransactions, timeRange, sevenDaysAgo, sixWeeksAgo]);

  const categoryData = useMemo(() => {
    return metricsUtils.calculateProductCategories(salesTransactions, sellableProducts);
  }, [salesTransactions, sellableProducts]);

  const itemsSoldData = useMemo(() => {
    return metricsUtils.calculateItemsSoldData(salesTransactions, timeRange, { sevenDaysAgo, sixWeeksAgo });
  }, [salesTransactions, timeRange, sevenDaysAgo, sixWeeksAgo]);

  const { totalRevenue: todayRevenue, totalItemsSold: todayItemsSold, totalProfit: todayProfit } = useMemo(() => {
    return metricsUtils.calculateTotalMetrics(todayTransactions, sellableProducts);
  }, [todayTransactions, sellableProducts]);

  const { totalRevenue: yesterdayRevenue, totalItemsSold: yesterdayItemsSold, totalProfit: yesterdayProfit } = useMemo(() => {
    return metricsUtils.calculateTotalMetrics(yesterdayTransactions, sellableProducts);
  }, [yesterdayTransactions, sellableProducts]);

  return {
    productPerformance,
    salesData,
    categoryData,
    itemsSoldData,
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
  const { sevenDaysAgo, sixWeeksAgo, startOfMonth, startOfToday, startOfYesterday, endOfYesterday } = dateRanges;

  const todayServiceIncomes = useMemo(() => {
    return metricsUtils.filterServiceIncomesByDayRange(serviceIncomes, startOfToday, new Date());
  }, [serviceIncomes, startOfToday]);

  const yesterdayServiceIncomes = useMemo(() => {
    return metricsUtils.filterServiceIncomesByDayRange(serviceIncomes, startOfYesterday, endOfYesterday);
  }, [serviceIncomes, startOfYesterday, endOfYesterday]);

  const servicesData = useMemo(() => {
    return metricsUtils.calculateServicesData(serviceIncomes, timeRange, { sevenDaysAgo, thirtyDaysAgo });
  }, [serviceIncomes, timeRange, sevenDaysAgo, thirtyDaysAgo]);

  const serviceTypeData = useMemo(() => {
    return metricsUtils.calculateServiceTypeData(servicesData);
  }, [servicesData]);

  const todayServicesData = useMemo(() => {
    return metricsUtils.calculateServicesData(todayServiceIncomes, "daily", { sevenDaysAgo, thirtyDaysAgo });
  }, [todayServiceIncomes, sevenDaysAgo, thirtyDaysAgo]);

  const todayServiceRevenue = useMemo(() => {
    return todayServicesData.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [todayServicesData]);
  
  const todayServicesProvided = useMemo(() => {
    return todayServicesData.reduce((sum, s) => sum + s.totalSold, 0);
  }, [todayServicesData]);
  
  const todayUniqueCustomers = useMemo(() => {
    const customers = new Set();
    todayServicesData.forEach(service => {
      service.customers?.forEach((c: string) => customers.add(c));
    });
    return customers.size;
  }, [todayServicesData]);

  const yesterdayServicesData = useMemo(() => {
    return metricsUtils.calculateServicesData(yesterdayServiceIncomes, "daily", { sevenDaysAgo, thirtyDaysAgo });
  }, [yesterdayServiceIncomes, sevenDaysAgo, thirtyDaysAgo]);

  const yesterdayServiceRevenue = useMemo(() => {
    return yesterdayServicesData.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [yesterdayServicesData]);
  
  const yesterdayServicesProvided = useMemo(() => {
    return yesterdayServicesData.reduce((sum, s) => sum + s.totalSold, 0);
  }, [yesterdayServicesData]);
  
  const yesterdayUniqueCustomers = useMemo(() => {
    const customers = new Set();
    yesterdayServicesData.forEach(service => {
      service.customers?.forEach((c: string) => customers.add(c));
    });
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
