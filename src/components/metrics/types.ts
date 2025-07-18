
import { Product, Transaction } from "@/models/types";

export interface ServiceIncomeWithCategory {
  id: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  date: Date;
  customerName: string | null;
  category?: string;
}

export interface ParsedServiceCategory {
  serviceIds?: string[];
  serviceNames?: string[];
  servicePrices?: number[];
  discount?: number;
}

export interface ServiceMetric {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  customers: Set<string>;
  uniqueCustomers?: number;
}

export interface ProductMetric {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  costPrice: number;
  profit: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}

export type TimeRangeType = "7days" | "30days" | "monthly";

export interface ProductMetricsProps {
  totalRevenue: number;
  totalProfit: number;
  totalItemsSold: number;
  salesData: SalesDataPoint[];
  productPerformance: ProductMetric[];
  categoryData: CategoryDataPoint[];
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  exportCSV: () => void;
  isExporting?: boolean;
}

export interface ServiceMetricsProps {
  totalServiceRevenue: number;
  totalUniqueCustomers: number;
  totalServicesProvided: number;
  servicesData: ServiceMetric[];
  serviceTypeData: CategoryDataPoint[];
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  exportCSV: () => void;
  isExporting?: boolean;
}
