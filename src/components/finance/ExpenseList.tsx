
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data, error, count } = await supabase
          .from("finances")
          .select("*", { count: 'exact' })
          .eq("type", "expense")
          .order("date", { ascending: false })
          .range((currentPage - 1) * limit, currentPage * limit - 1);

        if (error) throw error;

        if (data) {
          const formattedData: FinanceRecord[] = data.map(record => 
            mapFinanceRowToFinanceRecord(record)
          );

          setExpenses(formattedData);
          setTotalCount(count || 0);
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
  }, [toast, limit, currentPage]);

  useEffect(() => {
    if (newExpense) {
      const formattedExpense = mapFinanceRowToFinanceRecord(newExpense);
      setExpenses(prev => [formattedExpense, ...prev].slice(0, limit));
      setCurrentPage(1); // Reset to first page when new expense is added
      setTotalCount(prev => prev + 1); // Increment total count
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

  const handleDeleteExpense = async () => {
    if (!selectedExpenseId) return;
    setOpenDeleteDialog(false);
    try {
      const { error } = await supabase
        .from("finances")
        .delete()
        .eq("id", selectedExpenseId);

      if (error) throw error;

      setExpenses((prev) => prev.filter(e => e.id !== selectedExpenseId));
      setTotalCount(prev => Math.max(0, prev - 1)); // Decrement total count
      toast({
        title: "Expense deleted",
        description: "The expense record has been deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSelectedExpenseId(null);
    }
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
    <>
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="border rounded-md overflow-hidden">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-spa-cream">
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead className="w-12 text-center">Actions</TableHead>}
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
                  {isAdmin && (
                    <TableCell className="text-center">
                      <button
                        onClick={() => {
                          setSelectedExpenseId(expense.id);
                          setOpenDeleteDialog(true);
                        }}
                        className="p-1 rounded hover:bg-rose-100 transition-colors"
                        title="Delete"
                      >
                        <Trash size={18} className="text-rose-500" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Pagination Controls */}
        {totalCount > limit && (
          <div className="flex justify-between items-center p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalCount)} of {totalCount} records
            </span>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / limit), prev + 1))}
                    className={currentPage * limit >= totalCount ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </>
  );
};

export default ExpenseList;

