
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, DollarSign, Users, Award } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import MetricsCard from "./MetricsCard";
import MetricsBarChart from "./MetricsBarChart";
import MetricsPieChart from "./MetricsPieChart";
import DataTable from "./DataTable";

type ServiceMetricsProps = {
  totalServiceRevenue: number;
  totalUniqueCustomers: number;
  totalServicesProvided: number;
  servicesData: any[];
  serviceTypeData: any[];
  timeRange: "7days" | "30days" | "monthly";
  setTimeRange: (range: "7days" | "30days" | "monthly") => void;
  exportCSV: () => void;
};

const ServiceMetrics = ({
  totalServiceRevenue,
  totalUniqueCustomers,
  totalServicesProvided,
  servicesData,
  serviceTypeData,
  timeRange,
  setTimeRange,
  exportCSV
}: ServiceMetricsProps) => {
  const serviceColumns = [
    { key: "name", header: "Service Name", className: "font-medium" },
    { 
      key: "totalSold", 
      header: "Times Provided", 
      className: "text-right", 
      formatter: (value: any) => value || 0 
    },
    { 
      key: "totalRevenue", 
      header: "Revenue", 
      className: "text-right", 
      formatter: (value: any) => formatCurrency(value || 0) 
    },
    { 
      key: "uniqueCustomers", 
      header: "Unique Customers", 
      className: "text-right", 
      formatter: (value: any) => value || 0 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricsCard 
          title="Service Revenue" 
          value={formatCurrency(totalServiceRevenue)}
          icon={<DollarSign className="h-6 w-6 text-spa-deep" />}
        />
        
        <MetricsCard 
          title="Unique Customers" 
          value={totalUniqueCustomers}
          icon={<Users className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-water/20"
        />
        
        <MetricsCard 
          title="Services Provided" 
          value={totalServicesProvided}
          icon={<Award className="h-6 w-6 text-spa-deep" />}
          iconBgClass="bg-spa-stone/20"
        />
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Service Revenue</CardTitle>
            <CardDescription>Track your service performance</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={timeRange === "7days" ? "default" : "outline"} 
              onClick={() => setTimeRange("7days")}
              className="text-xs"
            >
              Last 7 Days
            </Button>
            <Button 
              variant={timeRange === "30days" ? "default" : "outline"} 
              onClick={() => setTimeRange("30days")}
              className="text-xs"
            >
              Last 30 Days
            </Button>
            <Button 
              variant={timeRange === "monthly" ? "default" : "outline"} 
              onClick={() => setTimeRange("monthly")}
              className="text-xs"
            >
              Monthly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <MetricsBarChart 
              data={servicesData.slice(0, 10).map(s => ({ 
                name: s.name, 
                revenue: s.totalRevenue 
              }))}
              dataKey="revenue"
              nameKey="name"
              barName="Revenue"
              barFill="#A6C0D0"
              tooltipType="currency"
              tooltipLabel="Revenue"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Service Performance</CardTitle>
            <CardDescription>Revenue analysis by service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <MetricsBarChart 
                data={servicesData.slice(0, 6)}
                dataKey="totalRevenue"
                nameKey="name"
                layout="vertical"
                barName="Revenue"
                barFill="#D1C6B8"
                tooltipType="currency"
                tooltipLabel="Revenue"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Services by Type</CardTitle>
            <CardDescription>Revenue distribution by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <MetricsPieChart 
                data={serviceTypeData}
                tooltipType="currency"
                tooltipLabel="Revenue"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-spa-deep">Service Performance</CardTitle>
            <CardDescription>Detailed service revenue analysis</CardDescription>
          </div>
          <Button className="bg-spa-deep text-white" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={servicesData}
            columns={serviceColumns}
            emptyMessage="No service data available."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceMetrics;
