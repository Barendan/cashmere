
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
import { AlertCircle, TrendingUp, TrendingDown, PieChart, DollarSign, Receipt, CreditCard, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const Finance = () => {
  usePageTitle("Finance");
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [newIncome, setNewIncome] = useState(null);
  const [newExpense, setNewExpense] = useState(null);

  // If user is not admin and tries to access expenses tab, redirect to income tab
  useEffect(() => {
    if (!isAdmin && activeTab === "expenses") {
      setActiveTab("summary");
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

  const currentMonth = format(new Date(), "MMMM yyyy");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 min-w-[90vw]">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-[500px] mt-6" />
      </div>
    );
  }

  // Animation variants for framer-motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 min-w-[90vw]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finance Dashboard</h1>
        <p className="text-slate-500">
          Financial overview for {currentMonth}
        </p>
      </motion.div>

      {/* Key Metrics Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {/* Income Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-l-4 border-emerald-500 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Monthly Income</p>
                  <div className="flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900">
                      <FinanceSummary.Income newIncome={newIncome} newExpense={newExpense} />
                    </h3>
                    <span className="ml-2 text-xs font-medium text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50">
                      +4.3%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Compared to last month</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expenses Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-l-4 border-rose-500 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-rose-600 mb-1">Monthly Expenses</p>
                  <div className="flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900">
                      <FinanceSummary.Expenses newIncome={newIncome} newExpense={newExpense} />
                    </h3>
                    <span className="ml-2 text-xs font-medium text-rose-600 px-2 py-0.5 rounded-full bg-rose-50">
                      +2.7%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Compared to last month</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Net Profit Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Net Profit</p>
                  <div className="flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900">
                      <FinanceSummary.NetProfit newIncome={newIncome} newExpense={newExpense} />
                    </h3>
                    <span className="ml-2 text-xs font-medium text-blue-600 px-2 py-0.5 rounded-full bg-blue-50">
                      +5.8%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Compared to last month</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8"
      >
        <Card className="shadow-md border-0 overflow-hidden">
          <CardContent className="p-0">
            <Tabs
              defaultValue={activeTab}
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="border-b bg-gray-50">
                <div className="flex items-center pl-6 pr-4">
                  <TabsList className="bg-transparent h-14 p-0 flex justify-start gap-2">
                    <TabsTrigger 
                      value="summary" 
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-5 h-14"
                    >
                      <PieChart className="h-4 w-4 mr-2" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger 
                      value="income" 
                      className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-5 h-14"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Income
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger 
                        value="expenses" 
                        className="data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none px-5 h-14"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Expenses
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
              </div>

              <div className="p-6">
                <TabsContent value="summary" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2">
                      <Card className="shadow-sm border border-slate-200 h-full">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-blue-500" />
                            Financial Summary
                          </CardTitle>
                          <CardDescription>Overview for {currentMonth}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <FinanceSummary newIncome={newIncome} newExpense={newExpense} />
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-3">
                      <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-gray-900">Recent Transactions</CardTitle>
                          <CardDescription>Your latest financial activity</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-4">
                            <div className="border-b pb-2">
                              <h4 className="font-medium text-emerald-600 flex items-center">
                                <Receipt className="h-4 w-4 mr-2" />
                                Recent Income
                              </h4>
                            </div>
                            <IncomeList newIncome={newIncome} limit={5} compact={true} />
                            <div className="text-right mt-2">
                              <button 
                                onClick={() => setActiveTab("income")} 
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center ml-auto"
                              >
                                View all income records 
                                <ArrowRight className="h-3 w-3 ml-1" /> 
                              </button>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="space-y-4">
                              <div className="border-b pb-2">
                                <h4 className="font-medium text-rose-600 flex items-center">
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Recent Expenses
                                </h4>
                              </div>
                              <ExpenseList newExpense={newExpense} limit={5} compact={true} />
                              <div className="text-right mt-2">
                                <button 
                                  onClick={() => setActiveTab("expenses")} 
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center ml-auto"
                                >
                                  View all expense records 
                                  <ArrowRight className="h-3 w-3 ml-1" /> 
                                </button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="income" className="m-0 space-y-6">
                  <div className="bg-white rounded-lg border border-emerald-100 shadow-sm">
                    <div className="border-b border-emerald-100 p-5">
                      <h3 className="font-medium text-gray-900 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-emerald-500" />
                        Record Income
                      </h3>
                    </div>
                    <div className="p-5">
                      <MultiServiceForm onIncomeAdded={handleIncomeAdded} />
                    </div>
                  </div>
                  
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4">
                      <CardTitle className="text-lg text-gray-900 flex items-center">
                        <Receipt className="h-5 w-5 mr-2 text-emerald-600" />
                        Income Records
                      </CardTitle>
                      <CardDescription>
                        History of all recorded service income
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <IncomeList newIncome={newIncome} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {isAdmin && (
                  <TabsContent value="expenses" className="m-0 space-y-6">
                    <div className="bg-white rounded-lg border border-rose-100 shadow-sm">
                      <div className="border-b border-rose-100 p-5">
                        <h3 className="font-medium text-gray-900 flex items-center">
                          <CreditCard className="h-5 w-5 mr-2 text-rose-500" />
                          Record New Expense
                        </h3>
                      </div>
                      <div className="p-5">
                        <ExpenseForm onExpenseAdded={handleExpenseAdded} />
                      </div>
                    </div>
                    
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <CardHeader className="bg-rose-50 border-b border-rose-100 pb-4">
                        <CardTitle className="text-lg text-gray-900 flex items-center">
                          <CreditCard className="h-5 w-5 mr-2 text-rose-600" />
                          Expense Records
                        </CardTitle>
                        <CardDescription>
                          History of all recorded business expenses
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ExpenseList newExpense={newExpense} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {!isAdmin && activeTab === "expenses" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You don't have permission to view the expenses tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Finance;
