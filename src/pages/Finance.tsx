
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import IncomeList from "@/components/finance/IncomeList";
import ExpenseForm from "@/components/finance/ExpenseForm";
import ExpenseList from "@/components/finance/ExpenseList";
import FinanceSummary from "@/components/finance/FinanceSummary";
import usePageTitle from "@/hooks/usePageTitle";
import { AlertCircle, TrendingUp, TrendingDown, PieChart, DollarSign, Receipt, CreditCard, ArrowRight, ShoppingBag, Star } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Finance = () => {
  usePageTitle("Finance");
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [newIncome, setNewIncome] = useState(null);
  const [newExpense, setNewExpense] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('financeActiveTab') || 'summary';
  });
  
  useEffect(() => {
    localStorage.setItem('financeActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExpenseAdded = (expense) => {
    setNewExpense(expense);
  };
  
  const handleNavigateToSales = () => {
    navigate('/'); // Root route is the Sales page
  };

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
    <div className="container mx-auto px-4 md:px-6 space-y-6 min-w-[90vw] xl:min-w-[80vw]">
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

      {isAdmin && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
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
      )}

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
                    <TabsTrigger 
                      value="expenses" 
                      className="data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none px-5 h-14"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Expenses
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="p-6">
                <TabsContent value="summary" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-5">
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
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="income" className="m-0 space-y-6">
                  {/* Sales Page Redirect Notice */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                            <ShoppingBag className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-blue-900 mb-2">
                            Record New Service Income
                          </h3>
                          <p className="text-blue-700 mb-4">
                            To record new service sales, please use the Sales page where you can add services to your cart, 
                            include customer details, tips, and process payments seamlessly.
                          </p>
                          <Button 
                            onClick={handleNavigateToSales}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Go to Sales Page
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900 flex items-center">
                        <Receipt className="h-5 w-5 mr-2 text-emerald-600" />
                        Income Records
                      </CardTitle>
                      <CardDescription>
                        History of all recorded service income (view only)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <IncomeList newIncome={newIncome} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="expenses" className="m-0 space-y-6">
                  <div className="shadow-sm">
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
                    <CardHeader className="pb-4">
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
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Finance;
