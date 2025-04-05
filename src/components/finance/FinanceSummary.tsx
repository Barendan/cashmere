
import React, { useState, useEffect } from "react";
import { supabase, mapFinanceRowToFinanceRecord, mapServiceRowToService } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { PiggyBank, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FinanceSummaryData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topService: string | null;
  topVendor: string | null;
}

const FinanceSummary = () => {
  const [summary, setSummary] = useState<FinanceSummaryData>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    topService: null,
    topVendor: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentMonth = format(new Date(), "MMMM yyyy");

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        // Get date range for current month
        const startDate = startOfMonth(new Date()).toISOString();
        const endDate = endOfMonth(new Date()).toISOString();

        // Get income sum
        const { data: incomeData, error: incomeError } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "income")
          .gte("date", startDate)
          .lte("date", endDate);

        if (incomeError) throw incomeError;

        // Get expense sum
        const { data: expenseData, error: expenseError } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "expense")
          .gte("date", startDate)
          .lte("date", endDate);

        if (expenseError) throw expenseError;

        // Calculate totals
        const totalIncome = incomeData ? incomeData.reduce((sum, record) => sum + (record.amount || 0), 0) : 0;
        const totalExpenses = expenseData ? expenseData.reduce((sum, record) => sum + (record.amount || 0), 0) : 0;
        const netProfit = totalIncome - totalExpenses;

        // Get top service
        const { data: topServiceData, error: topServiceError } = await supabase
          .from("finances")
          .select(`
            service_id,
            services:service_id (
              name
            )
          `)
          .eq("type", "income")
          .order("amount", { ascending: false })
          .limit(1);

        if (topServiceError) throw topServiceError;

        // Get top vendor
        const { data: topVendorData, error: topVendorError } = await supabase
          .from("finances")
          .select("vendor")
          .eq("type", "expense")
          .order("amount", { ascending: false })
          .limit(1);

        if (topVendorError) throw topVendorError;

        setSummary({
          totalIncome,
          totalExpenses,
          netProfit,
          topService: topServiceData && topServiceData.length > 0 && topServiceData[0].services 
            ? topServiceData[0].services.name 
            : null,
          topVendor: topVendorData && topVendorData.length > 0 && topVendorData[0].vendor 
            ? topVendorData[0].vendor 
            : null,
        });
      } catch (error) {
        console.error("Error fetching finance summary:", error);
        toast({
          title: "Error",
          description: "Failed to load financial summary",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">
        Summary for {currentMonth}
      </h4>

      <div className="grid gap-4">
        <Card className="bg-green-50">
          <CardContent className="p-4 flex items-center">
            <PiggyBank className="h-8 w-8 mr-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Income</p>
              <p className="text-xl font-bold text-green-700">
                ${summary.totalIncome.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardContent className="p-4 flex items-center">
            <CreditCard className="h-8 w-8 mr-4 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Expenses</p>
              <p className="text-xl font-bold text-red-700">
                ${summary.totalExpenses.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.netProfit >= 0 ? "bg-blue-50" : "bg-amber-50"}>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
            <p className={`text-2xl font-bold ${
              summary.netProfit >= 0 ? "text-blue-700" : "text-amber-700"
            }`}>
              ${summary.netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <div className="pt-2">
          {summary.topService && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Top service:</span> {summary.topService}
            </p>
          )}
          {summary.topVendor && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Top vendor:</span> {summary.topVendor}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceSummary;
