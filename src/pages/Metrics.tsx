
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useData } from "../contexts/DataContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package2, Award } from "lucide-react";
import usePageTitle from "@/hooks/usePageTitle";
import ProductMetrics from "@/components/metrics/ProductMetrics";
import ServiceMetrics from "@/components/metrics/ServiceMetrics";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { TimeRangeType } from "@/components/metrics/types";
import { useProductMetricsCalculation, useServiceMetricsCalculation } from "@/hooks/useMetricsCalculation";
import useMetricsExport from "@/hooks/useMetricsExport";

const Metrics = () => {
  usePageTitle("Business Metrics");
  const { products, fetchAllMetricsData, metricsCache, isLoadingMetrics: contextIsLoadingMetrics } = useData();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRangeType>("7days");
  const [metricView, setMetricView] = useState<"products" | "services">("products");
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Use cached data if available, otherwise fetch
  const transactions = useMemo(() => metricsCache?.transactions || [], [metricsCache]);
  const sales = useMemo(() => metricsCache?.sales || [], [metricsCache]);
  const serviceIncomes = useMemo(() => metricsCache?.serviceIncomes || [], [metricsCache]);

  const [wasCached, setWasCached] = useState<boolean>(false);
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || authLoading) return;

    const loadData = async () => {
      // If cache exists, use it immediately and mark as cached
      if (metricsCache) {
        setWasCached(true);
        setIsLoadingMetrics(false);
        hasLoggedRef.current = false; // Reset log flag when cache is used
        return;
      }

      // Otherwise fetch data and mark as fresh
      setWasCached(false);
      setIsLoadingMetrics(true);
      hasLoggedRef.current = false; // Reset log flag when fetching
      try {
        await fetchAllMetricsData();
      } catch (error) {
        console.error('Error loading metrics data:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadData();
  }, [isAdmin, authLoading, fetchAllMetricsData, metricsCache]);

  // Log when data is loaded (cached or fresh) - only once per data load
  useEffect(() => {
    if (metricsCache && transactions.length > 0 && !isLoadingMetrics && !hasLoggedRef.current) {
      console.log(`[Metrics] Data loaded${wasCached ? ' from cache' : ''}:`, {
        transactions: transactions.length,
        sales: sales.length,
        serviceIncomes: serviceIncomes.length,
        cached: wasCached
      });
      hasLoggedRef.current = true;
    }
  }, [metricsCache, transactions.length, sales.length, serviceIncomes.length, isLoadingMetrics, wasCached]);

  // Use our custom hooks for calculations
  const {
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
  } = useProductMetricsCalculation(products, transactions, sales, timeRange);

  const {
    servicesData,
    serviceTypeData,
    todayServiceRevenue,
    todayServicesProvided,
    todayUniqueCustomers,
    yesterdayServiceRevenue,
    yesterdayServicesProvided,
    yesterdayUniqueCustomers
  } = useServiceMetricsCalculation(serviceIncomes, timeRange);

  const { exportData: exportProductsData, isExporting: isExportingProducts } = useMetricsExport({
    getExportData: () => productPerformance,
    isProductData: true
  });

  const { exportData: exportServicesData, isExporting: isExportingServices } = useMetricsExport({
    getExportData: () => servicesData,
    isProductData: false
  });

  // Handle export based on current view
  const handleExport = () => {
    if (metricView === "products") {
      exportProductsData();
    } else {
      exportServicesData();
    }
  };

  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || isLoadingMetrics || contextIsLoadingMetrics) {
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
          <TabsList className="h-auto">
            <TabsTrigger value="products" className="flex items-center gap-2 text-base px-6 py-3">
              <Package2 className="h-5 w-5" />
              Products
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2 text-base px-6 py-3">
              <Award className="h-5 w-5" />
              Services
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {metricView === "products" ? (
        <ProductMetrics
          todayRevenue={todayRevenue}
          todayProfit={todayProfit}
          todayItemsSold={todayItemsSold}
          yesterdayRevenue={yesterdayRevenue}
          yesterdayProfit={yesterdayProfit}
          yesterdayItemsSold={yesterdayItemsSold}
          salesData={salesData}
          itemsSoldData={itemsSoldData}
          productPerformance={productPerformance}
          categoryData={categoryData}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          exportCSV={handleExport}
          isExporting={isExportingProducts}
          sales={sales}
          serviceIncomes={serviceIncomes}
        />
      ) : (
        <ServiceMetrics
          todayServiceRevenue={todayServiceRevenue}
          todayUniqueCustomers={todayUniqueCustomers}
          todayServicesProvided={todayServicesProvided}
          yesterdayServiceRevenue={yesterdayServiceRevenue}
          yesterdayUniqueCustomers={yesterdayUniqueCustomers}
          yesterdayServicesProvided={yesterdayServicesProvided}
          servicesData={servicesData}
          serviceTypeData={serviceTypeData}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          exportCSV={handleExport}
          isExporting={isExportingServices}
        />
      )}
    </div>
  );
};

export default Metrics;
