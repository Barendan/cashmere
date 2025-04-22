import React, { useState, useEffect } from 'react';
import { Transaction } from '@/models/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUpCircle, ChevronDownCircle, Clock, PlusCircle, MinusCircle, ShoppingBag, PackageCheck, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatCurrency } from '@/lib/format';
import TransactionRowGroup from './TransactionRowGroup';
import { BULK_RESTOCK_PRODUCT_ID, isBulkRestockProduct, isSystemMonthlyRestockProduct, isParentRestockTransaction } from "@/config/systemProducts";
import { Button } from '@/components/ui/button';

interface GroupedTransaction {
  saleId: string | null;
  transactions: Transaction[];
  isExpanded?: boolean;
}

interface TransactionsListProps {
  transactions: Transaction[];
  onViewRestockDetails?: (transaction: Transaction) => void;
}

const TransactionsList = ({ transactions, onViewRestockDetails }: TransactionsListProps) => {
  const [transactionGroups, setTransactionGroups] = useState<GroupedTransaction[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredType, setFilteredType] = useState<string | null>(null);
  
  useEffect(() => {
    let filteredTransactions = [...transactions];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        t.productName.toLowerCase().includes(query) || 
        t.userName.toLowerCase().includes(query)
      );
    }
    
    if (filteredType) {
      filteredTransactions = filteredTransactions.filter(t => t.type === filteredType);
    }
    
    const groupMap = new Map<string, Transaction[]>();
    
    filteredTransactions.forEach(transaction => {
      const key = transaction.saleId || 
                 (transaction.type === 'restock' && isBulkRestockProduct(transaction.productId) ? 
                  `monthly-restock-${transaction.id}` : 'no-sale-id');
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(transaction);
    });
    
    const groupsArray: GroupedTransaction[] = [];
    
    for (const [key, trxs] of groupMap.entries()) {
      if (key !== 'no-sale-id' && key !== 'monthly-restock' && !key.startsWith('monthly-restock-')) {
        groupsArray.push({
          saleId: key,
          transactions: trxs,
          isExpanded: expandedGroups[key] || false
        });
      }
    }
    
    for (const [key, trxs] of groupMap.entries()) {
      if (key.startsWith('monthly-restock-')) {
        groupsArray.push({
          saleId: key,
          transactions: trxs,
          isExpanded: expandedGroups[key] || false
        });
      }
    }
    
    if (groupMap.has('no-sale-id')) {
      groupsArray.push({
        saleId: 'no-sale-id',
        transactions: groupMap.get('no-sale-id')!,
        isExpanded: expandedGroups['no-sale-id'] || false
      });
    }
    
    setTransactionGroups(groupsArray);
  }, [transactions, searchQuery, filteredType, expandedGroups]);
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  const getGroupTitle = (group: GroupedTransaction) => {
    const { saleId, transactions } = group;
    
    if (!transactions.length) return 'No Transactions';
    
    if (saleId?.startsWith('monthly-restock-')) {
      const restock = transactions.find(t => isParentRestockTransaction(t));
      if (restock) {
        return `Monthly Restock - ${formatDate(restock.date)}`;
      }
    }
    
    if (saleId && saleId !== 'no-sale-id' && !saleId.startsWith('monthly-restock-')) {
      const sale = transactions[0];
      if (sale) {
        return `Sale - ${formatDate(sale.date)}`;
      }
    }
    
    if (saleId === 'no-sale-id') {
      return 'Individual Transactions';
    }
    
    return 'Transactions';
  };
  
  const getGroupIcon = (group: GroupedTransaction) => {
    const { saleId, transactions } = group;
    
    if (saleId?.startsWith('monthly-restock-')) {
      return <PackageCheck className="h-5 w-5 text-green-600" />;
    }
    
    if (saleId && saleId !== 'no-sale-id' && !saleId.startsWith('monthly-restock-')) {
      return <ShoppingBag className="h-5 w-5 text-blue-600" />;
    }
    
    return <Clock className="h-5 w-5 text-gray-600" />;
  };
  
  const calculateGroupTotal = (group: GroupedTransaction) => {
    if (!group.transactions.length) return 0;
    
    if (group.saleId?.startsWith('monthly-restock-')) {
      const restock = group.transactions.find(t => isParentRestockTransaction(t));
      if (restock) {
        return restock.price;
      }
    }
    
    return group.transactions.reduce((sum, t) => sum + t.price, 0);
  };
  
  const getTransactionCount = (group: GroupedTransaction) => {
    if (group.saleId?.startsWith('monthly-restock-')) {
      return group.transactions.filter(t => !isParentRestockTransaction(t)).length;
    }
    return group.transactions.length;
  };
  
  return (
    <Card className="my-6 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Transaction History</CardTitle>
        <CardDescription>
          View recent sales, restocks, and inventory adjustments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="space-x-1">
              <Badge 
                onClick={() => setFilteredType(null)} 
                className={`cursor-pointer hover:bg-secondary ${!filteredType ? 'bg-primary text-white' : 'bg-secondary'}`}
              >
                All
              </Badge>
              <Badge 
                onClick={() => setFilteredType('sale')} 
                className={`cursor-pointer hover:bg-blue-100 ${filteredType === 'sale' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
              >
                Sales
              </Badge>
              <Badge 
                onClick={() => setFilteredType('restock')} 
                className={`cursor-pointer hover:bg-green-100 ${filteredType === 'restock' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}
              >
                Restocks
              </Badge>
              <Badge 
                onClick={() => setFilteredType('adjustment')} 
                className={`cursor-pointer hover:bg-amber-100 ${filteredType === 'adjustment' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}
              >
                Adjustments
              </Badge>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                className="border rounded-md px-3 py-1 text-sm w-full md:w-[250px] outline-none focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {transactionGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No transactions found matching your criteria
                </div>
              ) : (
                transactionGroups.map((group, index) => (
                  <div key={group.saleId || index} className="border rounded-md overflow-hidden">
                    <div 
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
                      onClick={() => toggleGroup(group.saleId || 'no-sale-id')}
                    >
                      <div className="flex items-center gap-2">
                        {getGroupIcon(group)}
                        <span className="font-medium">{getGroupTitle(group)}</span>
                        <Badge className="bg-secondary">
                          {getTransactionCount(group)} item{getTransactionCount(group) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {group.saleId?.startsWith('monthly-restock-') ? 'Cost: ' : 'Total: '}
                          {formatCurrency(calculateGroupTotal(group))}
                        </span>
                        
                        {group.saleId?.startsWith('monthly-restock-') && onViewRestockDetails && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-800 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const restock = group.transactions.find(t => isParentRestockTransaction(t));
                              if (restock) {
                                onViewRestockDetails(restock);
                              }
                            }}
                          >
                            <span className="text-xs mr-1">Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {expandedGroups[group.saleId || 'no-sale-id'] ? (
                          <ChevronUpCircle className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDownCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {expandedGroups[group.saleId || 'no-sale-id'] && (
                      <TransactionRowGroup transactions={group.transactions} />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsList;
