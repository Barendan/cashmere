
import React, { useState, useEffect } from "react";
import { supabase, mapFinanceRowToFinanceRecord } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceRecord } from "@/models/types";

const categoryColors: Record<string, string> = {
  supplies: "bg-blue-100 text-blue-800",
  equipment: "bg-purple-100 text-purple-800",
  marketing: "bg-green-100 text-green-800",
  rent: "bg-yellow-100 text-yellow-800",
  utilities: "bg-indigo-100 text-indigo-800",
  insurance: "bg-pink-100 text-pink-800",
  salaries: "bg-cyan-100 text-cyan-800",
  training: "bg-teal-100 text-teal-800",
  maintenance: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

const ExpenseList = ({ newExpense }) => {
  const [expenses, setExpenses] = useState<FinanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data, error } = await supabase
          .from("finances")
          .select("*")
          .eq("type", "expense")
          .order("date", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data) {
          const formattedData: FinanceRecord[] = data.map(record => 
            mapFinanceRowToFinanceRecord(record)
          );

          setExpenses(formattedData);
        }
      } catch (error) {
        console.error("Error fetching expenses:", error);
        toast({
          title: "Error",
          description: "Failed to load expense records",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [toast]);

  // When a new expense is added, update the list
  useEffect(() => {
    if (newExpense) {
      const formattedExpense = mapFinanceRowToFinanceRecord(newExpense);
      setExpenses(prev => [formattedExpense, ...prev]);
    }
  }, [newExpense]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No expense records found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <h3 className="px-4 py-3 border-b font-medium">Recent Expenses</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{format(expense.date, "PP")}</TableCell>
                <TableCell>{expense.vendor || "Unknown"}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={`capitalize ${categoryColors[expense.category?.toLowerCase() || 'other'] || categoryColors.other}`}
                  >
                    {expense.category || "Other"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExpenseList;
