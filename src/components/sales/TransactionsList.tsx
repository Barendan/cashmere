import React, { useState, useEffect } from 'react';
import { Transaction } from '@/models/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Package, CalendarDays, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatCurrency } from '@/lib/format';
import TransactionRowGroup from './TransactionRowGroup';
import { BULK_RESTOCK_PRODUCT_ID, isBulkRestockProduct, isSystemMonthlyRestockProduct } from "@/config/systemProducts";
import { getRestockDetails } from '@/services/transactionService';
import RestockDetailsModal from "./RestockDetailsModal";

interface GroupedTransaction {
  saleId: string | null;
  parentTransactionId: string | null;
  transactions: Transaction[];
  childTransactions: Transaction[];
  date: Date;
  userName: string;
  totalAmount: number;
  originalTotal: number | undefined;
  discount: number | undefined;
  itemCount: number;
  isParentRestock: boolean;
}

interface TransactionsListProps {
  transactions: Transaction[];
}

const TransactionsList = ({ transactions }: TransactionsListProps) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [childTransactionsMap, setChildTransactionsMap] = useState<Record<string, Transaction[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [restockModal, setRestockModal] = useState<{
    open: boolean;
    parent: Transaction | null;
    children: Transaction[];
  }>({ open: false, parent: null, children: [] });

  const toggleGroup = async (groupId: string, isParentRestock: boolean) => {
    if (openGroup === groupId) {
      setOpenGroup(null);
    } else {
      setOpenGroup(groupId);
      
      if (isParentRestock && !childTransactionsMap[groupId]) {
        try {
          setLoadingDetails({...loadingDetails, [groupId]: true});
          const childTransactions = await getRestockDetails(groupId);
          setChildTransactionsMap({
            ...childTransactionsMap,
            [groupId]: childTransactions
          });
        } catch (error) {
          console.error("Error loading restock details:", error);
        } finally {
          setLoadingDetails({...loadingDetails, [groupId]: false});
        }
      }
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "sale":
        return "bg-green-100 text-green-800";
      case "restock":
        return "bg-blue-100 text-blue-800";
      case "return":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionTypeIcon = (type: string, productId: string): JSX.Element | null => {
    if (type === "restock" && isBulkRestockProduct(productId)) {
      return <CalendarDays className="h-3 w-3 mr-1" />;
    } else if (type === "restock") {
      return <Package className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  const filterIsAdjustment = filterType === 'adjustment';

  const renderQuantityBadge = (quantity: number) => {
    const isIncrease = quantity > 0;
    const badgeClass = isIncrease
      ? "bg-[#F2FCE2] text-green-700 border border-green-200"
      : "bg-[#ea384c]/10 text-red-700 border border-red-200";
    const sign = isIncrease ? "+" : "";
    return (
      <span
        className={`${badgeClass} px-3 py-0.5 rounded-full font-semibold text-sm inline-block min-w-[3.2rem] text-center animate-fade-in`}
        data-testid="adjustment-quantity-badge"
      >
        {sign}{quantity}
      </span>
    );
  };

  const groupTransactions = (): GroupedTransaction[] => {
    const filteredTransactions = transactions.filter((transaction) => {
      if (filterType !== "all") {
        if (filterType === "restock") {
          if (transaction.type !== "restock") {
            return false;
          }
        } else if (transaction.type !== filterType) {
          return false;
        }
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return transaction.productName.toLowerCase().includes(searchLower) ||
              transaction.userName.toLowerCase().includes(searchLower);
      }
      return true;
    });

    const parentOnlyTransactions = filteredTransactions.filter(t => 
      !t.parentTransactionId || 
      !filteredTransactions.some(parent => parent.id === t.parentTransactionId)
    );

    const groupMap = new Map<string, Transaction[]>();
    
    parentOnlyTransactions.forEach(transaction => {
      const key = transaction.saleId || 
                 (transaction.type === 'restock' && isBulkRestockProduct(transaction.productId) ? 
                  `monthly-restock-${transaction.id}` : transaction.id);
      
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)?.push(transaction);
    });
    
    const groupedTransactions: GroupedTransaction[] = [];
    
    groupMap.forEach((transactions, groupKey) => {
      const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      const firstTransaction = sortedTransactions[0];
      const isParentRestock = firstTransaction.type === 'restock' && 
                             isBulkRestockProduct(firstTransaction.productId);
      
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
        saleId: firstTransaction.saleId || null,
        parentTransactionId: isParentRestock ? firstTransaction.id : null,
        transactions: sortedTransactions,
        childTransactions: childTransactionsMap[firstTransaction.id] || [],
        date: new Date(firstTransaction.date),
        userName: firstTransaction.userName,
        totalAmount: finalTotal,
        originalTotal: hasDiscount ? originalTotal : undefined,
        discount: hasDiscount ? totalDiscount : undefined,
        itemCount: sortedTransactions.length,
        isParentRestock
      });
    });
    
    return groupedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const handleRestockClick = async (parentTransactionId: string, parentTx: Transaction) => {
    setLoadingDetails({...loadingDetails, [parentTransactionId]: true});
    try {
      const childTransactions = await getRestockDetails(parentTransactionId);
      setRestockModal({
        open: true,
        parent: parentTx,
        children: childTransactions,
      });
    } catch (error) {
      console.error("Error loading restock details:", error);
    } finally {
      setLoadingDetails(current => ({...current, [parentTransactionId]: false}));
    }
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
                  <TableHead>
                    {filterIsAdjustment ? 'Qty Diff' : 'Total'}
                  </TableHead>
                  <TableHead>Type</TableHead>
                  {!filterIsAdjustment && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedTransactions.length > 0 ? (
                  groupedTransactions.map((group) => {
                    const groupId = group.parentTransactionId || group.saleId || `group-${group.date.getTime()}`;
                    const hasDetails = group.transactions.length > 1 || 
                                      (group.isParentRestock && (childTransactionsMap[group.parentTransactionId!]?.length > 0 || 
                                      !childTransactionsMap[group.parentTransactionId!]));
                    const isRestockParent = group.isParentRestock;

                    if (filterIsAdjustment) {
                      const transaction = group.transactions[0];
                      return (
                        <TableRow
                          key={transaction.id}
                          className="bg-gray-50 font-medium"
                        >
                          <TableCell className="text-sm">
                            <div>
                              {new Date(group.date).toLocaleDateString()}
                              <div className="text-xs text-muted-foreground">
                                {new Date(group.date).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{transaction.productName}</span>
                          </TableCell>
                          <TableCell>
                            {group.userName}
                          </TableCell>
                          <TableCell>
                            {renderQuantityBadge(transaction.quantity)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTransactionTypeColor(transaction.type)}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (isRestockParent) {
                      return (
                        <React.Fragment key={groupId}>
                          <TableRow
                            className="bg-gray-50 font-medium cursor-pointer hover:bg-spa-sand/30 transition"
                            onClick={() => handleRestockClick(group.parentTransactionId!, group.transactions[0])}
                          >
                            <TableCell className="text-sm">
                              <div>
                                {new Date(group.date).toLocaleDateString()}
                                <div className="text-xs text-muted-foreground">
                                  {new Date(group.date).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">Restock</span>
                              {loadingDetails[groupId] && <span className="ml-2 text-xs text-muted-foreground">(Loading details...)</span>}
                            </TableCell>
                            <TableCell>{group.userName}</TableCell>
                            <TableCell>{formatCurrency(group.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeColor(group.transactions[0].type)}>
                                <span className="flex items-center">
                                  Restock
                                </span>
                              </Badge>
                              {group.discount && group.discount > 0 && (
                                <Badge className="ml-2 bg-red-100 text-red-800">
                                  Discount: {formatCurrency(group.discount)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={e => { 
                                  e.stopPropagation();
                                  handleRestockClick(group.parentTransactionId!, group.transactions[0]);
                                }}
                                aria-label="Show restock details"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    }

                    return (
                      <TransactionRowGroup 
                        key={groupId}
                        hasDetails={group.transactions.length > 1}
                        detailsExpanded={openGroup === groupId}
                        onToggleDetails={() => toggleGroup(groupId, group.isParentRestock)}
                        childTransactions={[]}
                      >
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
                              group.transactions[0].type === 'restock' && 
                              isBulkRestockProduct(group.transactions[0].productId) ? (
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
                            {loadingDetails[groupId] && <span className="ml-2 text-xs text-muted-foreground">(Loading details...)</span>}
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
                                {getTransactionTypeIcon(
                                  group.transactions[0].type, 
                                  group.transactions[0].productId
                                )}
                                {group.transactions[0].type === 'restock' && 
                                isBulkRestockProduct(group.transactions[0].productId) 
                                  ? 'Monthly Restock' 
                                  : group.transactions[0].type}
                              </span>
                            </Badge>
                            {group.discount && group.discount > 0 && (
                              <Badge className="ml-2 bg-red-100 text-red-800">
                                Discount: {formatCurrency(group.discount)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {hasDetails && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => toggleGroup(groupId, group.isParentRestock)}
                                aria-label={openGroup === groupId ? 
                                  "Collapse transaction details" : "Expand transaction details"}
                              >
                                {openGroup === groupId ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {group.transactions.length > 1 && openGroup === groupId && !group.isParentRestock &&
                          group.transactions.map(transaction => (
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
                                {transaction.quantity} × {formatCurrency(transaction.price / transaction.quantity)}
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
                          ))
                        }
                      </TransactionRowGroup>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={filterIsAdjustment ? 5 : 6} className="text-center py-6 text-muted-foreground">
                      No transactions found for the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <RestockDetailsModal
            open={restockModal.open}
            onOpenChange={open => setRestockModal(modal => ({...modal, open }))}
            parentTransaction={restockModal.parent}
            childTransactions={restockModal.children}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsList;
