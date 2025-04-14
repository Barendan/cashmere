import React, { useState } from 'react';
import { Transaction } from '@/models/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/format';

interface GroupedTransaction {
  saleId: string | null;
  transactions: Transaction[];
  date: Date;
  userName: string;
  totalAmount: number;
  originalTotal: number | undefined;
  discount: number | undefined;
  itemCount: number;
}

interface TransactionsListProps {
  transactions: Transaction[];
}

const TransactionsList = ({ transactions }: TransactionsListProps) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [openSale, setOpenSale] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { isAdmin } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  
  const toggleSale = (saleId: string | null) => {
    if (openSale === saleId) {
      setOpenSale(null);
    } else {
      setOpenSale(saleId);
    }
  };
  
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "sale":
        return "bg-green-100 text-green-800";
      case "restock":
        return "bg-blue-100 text-blue-800";
      case "adjustment":
        return "bg-amber-100 text-amber-800";
      case "return":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const groupTransactions = (): GroupedTransaction[] => {
    const filteredTransactions = transactions.filter((transaction) => {
      if (filterType !== "all" && transaction.type !== filterType) return false;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return transaction.productName.toLowerCase().includes(searchLower) ||
              transaction.userName.toLowerCase().includes(searchLower);
      }
      return true;
    });

    const groupMap = new Map<string, Transaction[]>();
    
    filteredTransactions.forEach(transaction => {
      const key = transaction.saleId || 'no-sale-id';
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)?.push(transaction);
    });
    
    const groupedTransactions: GroupedTransaction[] = [];
    
    groupMap.forEach((transactions, saleId) => {
      const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      const firstTransaction = sortedTransactions[0];
      
      let originalTotal = 0;
      let finalTotal = 0;
      let hasDiscount = false;
      
      sortedTransactions.forEach(t => {
        if (t.discount && t.discount > 0) {
          hasDiscount = true;
          originalTotal += (t.originalPrice || t.price + t.discount);
          finalTotal += t.price;
        } else if (t.originalPrice && t.originalPrice > t.price) {
          hasDiscount = true;
          originalTotal += t.originalPrice;
          finalTotal += t.price;
        } else {
          originalTotal += t.price;
          finalTotal += t.price;
        }
      });
      
      const totalDiscount = originalTotal - finalTotal;
      
      groupedTransactions.push({
        saleId: saleId === 'no-sale-id' ? null : saleId,
        transactions: sortedTransactions,
        date: new Date(firstTransaction.date),
        userName: firstTransaction.userName,
        totalAmount: finalTotal,
        originalTotal: hasDiscount ? originalTotal : undefined,
        discount: hasDiscount ? totalDiscount : undefined,
        itemCount: sortedTransactions.length
      });
    });
    
    return groupedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };
  
    const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    
    try {
      const { error } = await supabase
        .from('finances')
        .delete()
        .eq('id', incomeToDelete);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Income record deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting income record:", error);
      toast({
        title: "Error",
        description: "Failed to delete income record",
        variant: "destructive",
      });
    } finally {
      setIncomeToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setIncomeToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  const groupedTransactions = groupTransactions();
  
  return (
    <Card className="bg-white mb-6 flex-shrink-0 bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/70 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-spa-deep">Sales & Inventory Log</CardTitle>
            <CardDescription>History of all transactions</CardDescription>
          </div>
          <Tabs defaultValue="all" onValueChange={setFilterType} className="w-[400px]">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sale">Sales</TabsTrigger>
              <TabsTrigger value="restock">Restocks</TabsTrigger>
              <TabsTrigger value="adjustment">Adjustments</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
        <div className="rounded-md border border-spa-sand overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow>
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <ScrollArea className="max-h-[30vh]">
              <TableBody>
                {groupedTransactions.length > 0 ? (
                  groupedTransactions.map((group) => (
                    <React.Fragment key={group.saleId || `no-sale-${group.date.getTime()}`}>
                      <TableRow className="bg-gray-50 font-medium">
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{format(group.date, 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">{format(group.date, 'h:mm a')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.saleId ? (
                            <span className="font-medium">Sale with {group.itemCount} item(s)</span>
                          ) : (
                            <span className="font-medium">{group.transactions[0].productName}</span>
                          )}
                        </TableCell>
                        <TableCell>{group.userName}</TableCell>
                        <TableCell>Payment Method Here</TableCell>
                        <TableCell>
                          {group.discount && group.discount > 0 ? (
                            <div className="flex flex-col">
                              <span className="line-through text-sm text-muted-foreground">
                                {formatCurrency(group.originalTotal || 0)}
                              </span>
                              <div className="flex items-center text-red-600">
                                <Percent className="h-3 w-3 mr-0.5" />
                                <span>{formatCurrency(group.totalAmount)}</span>
                              </div>
                            </div>
                          ) : (
                            formatCurrency(group.totalAmount)
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {group.transactions.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => toggleSale(group.saleId || `no-sale-${group.date.getTime()}`)}
                              >
                                {openSale === (group.saleId || `no-sale-${group.date.getTime()}`) ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {group.transactions.length > 1 && openSale === (group.saleId || `no-sale-${group.date.getTime()}`) && (
                        <>
                          {group.transactions.map(transaction => (
                            <TableRow key={transaction.id} className="bg-white border-t border-dashed border-gray-200">
                              <TableCell></TableCell>
                              <TableCell className="py-2 pl-8">
                                <div className="flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                                  {transaction.productName}
                                </div>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell>Payment Method Here</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span>{transaction.quantity} item(s)</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.discount && transaction.discount > 0 && (
                                  <Badge className="mr-2 text-[0.65rem] py-0 px-1 bg-red-100 text-red-800 flex items-center">
                                    <Percent className="h-2 w-2 mr-0.5" />
                                    {formatCurrency(transaction.discount)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.originalPrice && transaction.originalPrice > transaction.price ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground line-through">
                                      {formatCurrency(transaction.originalPrice)}
                                    </span>
                                    <span className="text-red-600">
                                      {formatCurrency(transaction.price)}
                                    </span>
                                  </div>
                                ) : (
                                  formatCurrency(transaction.price)
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No transactions found for the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </ScrollArea>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default TransactionsList;
