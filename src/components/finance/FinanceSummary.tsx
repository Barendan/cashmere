
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, CreditCard, Wallet } from "lucide-react";

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topServiceName: string;
  topServiceAmount: number;
  topVendor: string;
  topVendorAmount: number;
}

interface FinanceSummaryProps {
  newIncome: any;
  newExpense: any;
}

interface FinanceValueProps {
  newIncome: any;
  newExpense: any;
}

const IncomeValue: React.FC<FinanceValueProps> = ({ newIncome, newExpense }) => {
  const [value, setValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "income")
          .gte("date", startOfMonth.toISOString());

        if (error) throw error;
        
        const total = data?.reduce((sum, record) => sum + record.amount, 0) || 0;
        setValue(total);
      } catch (error) {
        console.error("Error fetching income:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [newIncome, newExpense]);

  if (isLoading) return <Skeleton className="h-7 w-24" />;
  return <>${value.toFixed(2)}</>;
};

const ExpensesValue: React.FC<FinanceValueProps> = ({ newIncome, newExpense }) => {
  const [value, setValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "expense")
          .gte("date", startOfMonth.toISOString());

        if (error) throw error;
        
        const total = data?.reduce((sum, record) => sum + record.amount, 0) || 0;
        setValue(total);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [newIncome, newExpense]);

  if (isLoading) return <Skeleton className="h-7 w-24" />;
  return <>${value.toFixed(2)}</>;
};

const NetProfitValue: React.FC<FinanceValueProps> = ({ newIncome, newExpense }) => {
  const [income, setIncome] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Fetch income
        const { data: incomeData, error: incomeError } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "income")
          .gte("date", startOfMonth.toISOString());

        if (incomeError) throw incomeError;
        
        // Fetch expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from("finances")
          .select("amount")
          .eq("type", "expense")
          .gte("date", startOfMonth.toISOString());

        if (expenseError) throw expenseError;
        
        const totalIncome = incomeData?.reduce((sum, record) => sum + record.amount, 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, record) => sum + record.amount, 0) || 0;
        
        setIncome(totalIncome);
        setExpenses(totalExpenses);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [newIncome, newExpense]);

  if (isLoading) return <Skeleton className="h-7 w-24" />;
  
  const netProfit = income - expenses;
  return <>${netProfit.toFixed(2)}</>;
};

const FinanceSummary: React.FC<FinanceSummaryProps> & {
  Income: React.FC<FinanceValueProps>;
  Expenses: React.FC<FinanceValueProps>;
  NetProfit: React.FC<FinanceValueProps>;
} = ({ newIncome, newExpense }) => {
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
    <div className="space-y-5">
      <div className="space-y-4">
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-700">Total Income</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${summary.totalIncome.toFixed(2)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-rose-700">Total Expenses</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${summary.totalExpenses.toFixed(2)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={summary.netProfit >= 0 ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className={`text-sm font-medium ${summary.netProfit >= 0 ? "text-blue-700" : "text-amber-700"}`}>Net Profit</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${summary.netProfit.toFixed(2)}
              </div>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${summary.netProfit >= 0 ? "bg-blue-100" : "bg-amber-100"}`}>
              {summary.netProfit >= 0 ? (
                <TrendingUp className={`h-5 w-5 ${summary.netProfit >= 0 ? "text-blue-600" : "text-amber-600"}`} />
              ) : (
                <TrendingDown className={`h-5 w-5 ${summary.netProfit >= 0 ? "text-blue-600" : "text-amber-600"}`} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Wallet className="h-4 w-4 mr-1 text-emerald-600" /> 
            Top Service
          </div>
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-md border border-emerald-100">
            <span className="font-medium text-gray-900">{summary.topServiceName}</span>
            <span className="font-semibold text-emerald-700">${summary.topServiceAmount.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <CreditCard className="h-4 w-4 mr-1 text-rose-600" /> 
            Top Vendor
          </div>
          <div className="flex justify-between items-center p-3 bg-rose-50 rounded-md border border-rose-100">
            <span className="font-medium text-gray-900">{summary.topVendor}</span>
            <span className="font-semibold text-rose-700">${summary.topVendorAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add the individual value components
FinanceSummary.Income = IncomeValue;
FinanceSummary.Expenses = ExpensesValue;
FinanceSummary.NetProfit = NetProfitValue;

export default FinanceSummary;
