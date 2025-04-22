
import React, { useState } from "react";
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
  const { products, transactions, sales, serviceIncomes, isLoading } = useData();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRangeType>("7days");
  const [metricView, setMetricView] = useState<"products" | "services">("products");

  // Use our custom hooks for calculations
  const {
    productPerformance,
    salesData,
    categoryData,
    totalRevenue,
    totalItemsSold,
    totalProfit
  } = useProductMetricsCalculation(products, transactions, sales, timeRange);

  const {
    servicesData,
    serviceTypeData,
    totalServiceRevenue,
    totalServicesProvided,
    totalUniqueCustomers
  } = useServiceMetricsCalculation(serviceIncomes, timeRange);

  // Setup metrics export
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
          exportCSV={handleExport}
          isExporting={isExportingProducts}
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
          exportCSV={handleExport}
          isExporting={isExportingServices}
        />
      )}
    </div>
  );
};

export default Metrics;
