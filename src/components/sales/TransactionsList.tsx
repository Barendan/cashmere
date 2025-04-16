
import React, { useState } from 'react';
import { Transaction } from '@/models/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Package, CalendarDays, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatCurrency } from '@/lib/format';

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
      case "monthly-restock":
        return "bg-indigo-100 text-indigo-800";
      case "return":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Updated function to return null instead of empty fragments
  const getTransactionTypeIcon = (type: string): JSX.Element | null => {
    switch (type) {
      case "sale":
        return null; // Changed from <></> to null
      case "restock":
        return <Package className="h-3 w-3 mr-1" />;
      case "monthly-restock":
        return <CalendarDays className="h-3 w-3 mr-1" />;
      case "return":
        return null; // Changed from <></> to null
      default:
        return null; // Changed from <></> to null
    }
  };

  const groupTransactions = (): GroupedTransaction[] => {
    const filteredTransactions = transactions.filter((transaction) => {
      if (filterType !== "all" && 
          !(filterType === "restock" && 
            (transaction.type === "restock" || transaction.type === "monthly-restock")) && 
          transaction.type !== filterType) {
        return false;
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return transaction.productName.toLowerCase().includes(searchLower) ||
              transaction.userName.toLowerCase().includes(searchLower);
      }
      return true;
    });

    const groupMap = new Map<string, Transaction[]>();
    
    filteredTransactions.forEach(transaction => {
      const key = transaction.saleId || 
                 (transaction.type === 'monthly-restock' ? 
                  `monthly-restock-${transaction.id}` : 'no-sale-id');
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
  
  const groupedTransactions = groupTransactions();
  
  return (
    <Card className="bg-white mb-6 flex-shrink-0 bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/70 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-spa-deep">Product Sales Log</CardTitle>
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
        <div className="rounded-md border border-spa-sand flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow overflow-auto max-h-[30vh]">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedTransactions.length > 0 ? (
                  groupedTransactions.map((group) => (
                    <React.Fragment key={group.saleId || `no-sale-${group.date.getTime()}`}>
                      <TableRow className="bg-gray-50 font-medium">
                        <TableCell className="text-sm">
                          <div>
                            {new Date(group.date).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {new Date(group.date).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.saleId ? (
                            group.transactions[0].type === 'monthly-restock' ? (
                              <span className="font-medium">Monthly Inventory Restock</span>
                            ) : (
                              group.itemCount === 1 ? (
                                <span className="font-medium">{group.transactions[0].productName}</span>
                              ) : (
                                <span className="font-medium">Sale with {group.itemCount} item(s)</span>
                              )
                            )
                          ) : (
                            <span className="font-medium">{group.transactions[0].productName}</span>
                          )}
                        </TableCell>
                        <TableCell>{group.userName}</TableCell>
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
                        <TableCell>
                          <Badge className={getTransactionTypeColor(group.transactions[0].type)}>
                            <span className="flex items-center">
                              {getTransactionTypeIcon(group.transactions[0].type)}
                              {group.transactions[0].type === 'monthly-restock' ? 'Monthly Restock' : group.transactions[0].type}
                            </span>
                          </Badge>
                          {group.discount && group.discount > 0 && (
                            <Badge className="ml-2 bg-red-100 text-red-800">
                              Discount: {formatCurrency(group.discount)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {group.transactions.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => toggleSale(group.saleId || `no-sale-${group.date.getTime()}`)}
                              aria-label={openSale === (group.saleId || `no-sale-${group.date.getTime()}`) ? 
                                "Collapse transaction details" : "Expand transaction details"}
                            >
                              {openSale === (group.saleId || `no-sale-${group.date.getTime()}`) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                          )}
                        </TableCell>
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
                              <TableCell>
                                
                              </TableCell>
                              <TableCell>
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
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsList;
