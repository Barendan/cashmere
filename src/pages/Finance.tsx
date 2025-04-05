
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import IncomeForm from "@/components/finance/IncomeForm";
import IncomeList from "@/components/finance/IncomeList";
import ExpenseForm from "@/components/finance/ExpenseForm";
import ExpenseList from "@/components/finance/ExpenseList";
import FinanceSummary from "@/components/finance/FinanceSummary";

const Finance = () => {
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("income");

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
        <h2 className="text-3xl font-bold tracking-tight">Finance Management</h2>
        <p className="text-muted-foreground">
          Track service income and business expenses
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Overview of income and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceSummary />
          </CardContent>
        </Card>

        <Card className="col-span-3 md:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Track Finances</CardTitle>
            <CardDescription>Record service income and business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="income">Service Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
              </TabsList>
              <TabsContent value="income" className="space-y-6">
                <IncomeForm />
                <IncomeList />
              </TabsContent>
              <TabsContent value="expense" className="space-y-6">
                <ExpenseForm />
                <ExpenseList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;
