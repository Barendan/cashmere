
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { FinanceRecord } from "@/models/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const categoryColors: Record<string, string> = {
  supplies: "bg-blue-100 text-blue-800 border-blue-200",
  equipment: "bg-purple-100 text-purple-800 border-purple-200",
  marketing: "bg-green-100 text-green-800 border-green-200",
  rent: "bg-yellow-100 text-yellow-800 border-yellow-200",
  utilities: "bg-indigo-100 text-indigo-800 border-indigo-200",
  insurance: "bg-pink-100 text-pink-800 border-pink-200",
  salaries: "bg-cyan-100 text-cyan-800 border-cyan-200",
  training: "bg-teal-100 text-teal-800 border-teal-200",
  maintenance: "bg-orange-100 text-orange-800 border-orange-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
};

interface ExpenseListProps {
  newExpense: any;
  limit?: number;
  compact?: boolean;
}

const ExpenseList = ({ newExpense, limit = 20, compact = false }: ExpenseListProps) => {
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
          .limit(limit);

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
  }, [toast, limit]);

  useEffect(() => {
    if (newExpense) {
      const formattedExpense = mapFinanceRowToFinanceRecord(newExpense);
      setExpenses(prev => [formattedExpense, ...prev].slice(0, limit));
    }
  }, [newExpense, limit]);

  const renderDescription = (desc?: string) => {
    if (!desc) return <span className="text-gray-400 italic">No description</span>;
    if (desc.length <= 40) {
      return <span>{desc}</span>;
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate max-w-xs block cursor-pointer" title={desc}>{desc}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-md">
            {desc}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
      <div className="text-center py-6 border rounded-md bg-gray-50">
        <p className="text-gray-500">No expense records found</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3 max-h-[30vh] overflow-auto">
        {expenses.map((expense) => (
          <div 
            key={expense.id} 
            className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-rose-200 transition-colors"
          >
            <div className="flex flex-col">
              <div className="font-medium text-gray-900">{expense.vendor || "Unknown vendor"}</div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>{format(expense.date, "PP")}</span>
                <span>•</span>
                <Badge 
                  variant="outline"
                  className={`capitalize text-xs py-0 px-1.5 ${categoryColors[expense.category?.toLowerCase() || 'other'] || categoryColors.other}`}
                >
                  {expense.category || "Other"}
                </Badge>
                <span>•</span>
                <span className="truncate max-w-xs">{expense.description || <span className="text-gray-400 italic">No description</span>}</span>
              </div>
            </div>
            <div className="font-semibold text-rose-600">${expense.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-spa-cream">
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-rose-50">
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
                <TableCell className="truncate max-w-xs">
                  {renderDescription(expense.description)}
                </TableCell>
                <TableCell className="text-right font-medium text-rose-600">${expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExpenseList;

