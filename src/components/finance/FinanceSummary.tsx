
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { format } from "date-fns";

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topServiceName: string;
  topServiceAmount: number;
  topVendor: string;
  topVendorAmount: number;
}

const FinanceSummary = ({ newIncome, newExpense }) => {
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    topServiceName: "",
    topServiceAmount: 0,
    topVendor: "",
    topVendorAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinancialSummary = async () => {
    try {
      // Fetch total income for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: incomeData, error: incomeError } = await supabase
        .from("finances")
        .select("amount")
        .eq("type", "income")
        .gte("date", startOfMonth.toISOString());

      // Fetch total expenses for current month
      const { data: expenseData, error: expenseError } = await supabase
        .from("finances")
        .select("amount")
        .eq("type", "expense")
        .gte("date", startOfMonth.toISOString());

      if (incomeError || expenseError) {
        throw incomeError || expenseError;
      }

      // Calculate totals
      const totalIncome = incomeData?.reduce((sum, record) => sum + record.amount, 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, record) => sum + record.amount, 0) || 0;
      const netProfit = totalIncome - totalExpenses;

      // Fetch top service
      const { data: topServiceData, error: topServiceError } = await supabase
        .from("finances")
        .select(`
          amount, 
          services:service_id (name)
        `)
        .eq("type", "income")
        .not("service_id", "is", null)
        .order("amount", { ascending: false })
        .limit(1);

      // Fetch top vendor
      const { data: topVendorData, error: topVendorError } = await supabase
        .from("finances")
        .select(`amount, vendor`)
        .eq("type", "expense")
        .not("vendor", "is", null)
        .order("amount", { ascending: false })
        .limit(1);

      const topServiceName = topServiceData?.[0]?.services?.name || "No services";
      const topServiceAmount = topServiceData?.[0]?.amount || 0;
      const topVendor = topVendorData?.[0]?.vendor || "No vendors";
      const topVendorAmount = topVendorData?.[0]?.amount || 0;

      setSummary({
        totalIncome,
        totalExpenses,
        netProfit,
        topServiceName,
        topServiceAmount,
        topVendor,
        topVendorAmount,
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and refresh when new transactions are added
  useEffect(() => {
    fetchFinancialSummary();
  }, [newIncome, newExpense]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Summary for {currentMonth}
      </div>
      <div className="grid gap-4">
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Total Income</div>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">
              ${summary.totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className={`${summary.netProfit >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Net Profit</div>
            <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-blue-600" : "text-amber-600"}`}>
              ${summary.netProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <div className="text-sm font-medium mb-2">Top Service</div>
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
          <span className="font-medium">{summary.topServiceName}</span>
          <span>${summary.topServiceAmount.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Top Vendor</div>
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
          <span className="font-medium">{summary.topVendor}</span>
          <span>${summary.topVendorAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummary;
