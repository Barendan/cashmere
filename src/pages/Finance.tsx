
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MultiServiceForm from "@/components/finance/MultiServiceForm";
import IncomeList from "@/components/finance/IncomeList";
import ExpenseForm from "@/components/finance/ExpenseForm";
import ExpenseList from "@/components/finance/ExpenseList";
import FinanceSummary from "@/components/finance/FinanceSummary";
import usePageTitle from "@/hooks/usePageTitle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, DollarSign, Wallet, TrendingUp, Receipt, CreditCard } from "lucide-react";
import { HoverFillButton } from "@/components/ui/hover-fill-button";

const Finance = () => {
  usePageTitle("Finance");
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("income");
  const [newIncome, setNewIncome] = useState(null);
  const [newExpense, setNewExpense] = useState(null);

  // If user is not admin and tries to access expenses tab, redirect to income tab
  useEffect(() => {
    if (!isAdmin && activeTab === "expense") {
      setActiveTab("income");
    }
  }, [isAdmin, activeTab]);

  const handleIncomeAdded = (income) => {
    setNewIncome(income);
  };

  const handleExpenseAdded = (expense) => {
    setNewExpense(expense);
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-spa-deep">Finance Management</h2>
        <p className="text-muted-foreground">
          Track service income and business expenses
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column - Financial Summary */}
        <Card className="lg:col-span-4 border-0 shadow-md bg-gradient-to-br from-[#f8f9fc] to-[#edf2fa]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-[#374151] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#6366f1]" />
              Financial Summary
            </CardTitle>
            <CardDescription>Overview of income and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceSummary newIncome={newIncome} newExpense={newExpense} />
          </CardContent>
        </Card>

        {/* Right Column - Finance Tabs */}
        <Card className="lg:col-span-8 border-0 shadow-md bg-gradient-to-br from-[#f8f9fc] to-[#edf2fa]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-[#374151] flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#6366f1]" />
              Track Finances
            </CardTitle>
            <CardDescription>Record service income and business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={activeTab}
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} mb-6 bg-[#e5e7eb]`}>
                <TabsTrigger value="income" className="data-[state=active]:bg-white">
                  <Receipt className="h-4 w-4 mr-2" />
                  Service Income
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="expense" className="data-[state=active]:bg-white">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Expenses
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="income" className="space-y-6">
                <div className="bg-white p-5 rounded-lg border border-[#e5e7eb] shadow-sm">
                  <h3 className="font-medium text-[#374151] mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-[#6366f1]" />
                    Record New Income
                  </h3>
                  <MultiServiceForm onIncomeAdded={handleIncomeAdded} />
                </div>
                <IncomeList newIncome={newIncome} />
              </TabsContent>
              {isAdmin && (
                <TabsContent value="expense" className="space-y-6">
                  <div className="bg-white p-5 rounded-lg border border-[#e5e7eb] shadow-sm">
                    <h3 className="font-medium text-[#374151] mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-[#6366f1]" />
                      Record New Expense
                    </h3>
                    <ExpenseForm onExpenseAdded={handleExpenseAdded} />
                  </div>
                  <ExpenseList newExpense={newExpense} />
                </TabsContent>
              )}
              {!isAdmin && activeTab === "expense" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have permission to view the expenses tab.
                  </AlertDescription>
                </Alert>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;
