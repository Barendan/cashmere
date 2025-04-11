import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { Product, Transaction } from "../models/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import usePageTitle from "@/hooks/usePageTitle";
import ShoppingCart from "@/components/sales/ShoppingCart";
import ProductCard from "@/components/sales/ProductCard";
import { formatDate, formatCurrency } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GroupedTransaction {
  saleId: string | null;
  transactions: Transaction[];
  date: Date;
  userName: string;
  totalAmount: number;
  itemCount: number;
}

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, transactions, recordBulkSale, undoLastTransaction } = useData();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [openSale, setOpenSale] = useState<string | null>(null);
  
  const availableProducts = products
    .filter((product) => product.stockQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const handleAddToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    if (existingItem) return;
    
    setCartItems([...cartItems, { product, quantity: 1 }]);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };
  
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const safeQuantity = Math.min(quantity, product.stockQuantity);
    
    setCartItems(cartItems.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: safeQuantity }
        : item
    ));
  };
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product.id !== productId));
  };
  
  const handleClearCart = () => {
    setCartItems([]);
  };
  
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      await recordBulkSale(cartItems);
      setCartItems([]);
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        title: "Error",
        description: "Failed to process the sale. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
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
      const totalAmount = sortedTransactions.reduce((sum, t) => sum + t.price, 0);
      
      groupedTransactions.push({
        saleId: saleId === 'no-sale-id' ? null : saleId,
        transactions: sortedTransactions,
        date: new Date(firstTransaction.date),
        userName: firstTransaction.userName,
        totalAmount,
        itemCount: sortedTransactions.length
      });
    });
    
    return groupedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const toggleSale = (saleId: string | null) => {
    if (openSale === saleId) {
      setOpenSale(null);
    } else {
      setOpenSale(saleId);
    }
  };

  const isProductInCart = (productId: string) => {
    return cartItems.some(item => item.product.id === productId);
  };
  
  const filteredProducts = availableProducts.filter(product => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return product.name.toLowerCase().includes(searchLower) ||
           (product.description && product.description.toLowerCase().includes(searchLower));
  });

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

  const groupedTransactions = groupTransactions();

  return (
    <div className="w-full md:min-w-[90vw] xl:min-w-[90vw] flex flex-col min-h-[calc(100vh-4rem)] px-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 h-[75vh]">
        <Card className="lg:col-span-3 flex flex-col overflow-hidden h-full bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/50">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-spa-deep">Available Products</CardTitle>
            <CardDescription>Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-6 pt-2 overflow-hidden h-[calc(100%-85px)]">
            <div className="mb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search" 
                  placeholder="Search products..." 
                  className="pl-8 border-spa-sand"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="flex-grow pr-4 pt-2 h-full">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map((product, index) => (
                    <ProductCard 
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isInCart={isProductInCart(product.id)}
                      cardStyle={index < 3 ? `design-${index + 1}` : ""}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground flex items-center justify-center h-full">
                  <div>
                    <p>No products found</p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 
                        "Try a different search term" : 
                        "There are no products with available stock"}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 flex flex-col overflow-hidden h-full">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-spa-deep">Shopping Cart</CardTitle>
            <CardDescription>Review and complete sale</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-6 pt-0 overflow-hidden h-[calc(100%-85px)]">
            <div className="flex-grow flex flex-col h-full">
              <ShoppingCart 
                items={cartItems}
                updateQuantity={handleUpdateQuantity}
                removeItem={handleRemoveItem}
                clearCart={handleClearCart}
                recordSale={handleCompleteSale}
                isProcessing={isProcessing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white mb-6 flex-shrink-0 bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/70">
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
        <CardContent>
          <div className="rounded-md border border-spa-sand">
            <Table>
              <TableHeader>
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
                          {formatDate(group.date)}
                        </TableCell>
                        <TableCell>
                          {group.saleId ? (
                            <span className="font-medium">Sale with {group.itemCount} item(s)</span>
                          ) : (
                            <span className="font-medium">{group.transactions[0].productName}</span>
                          )}
                        </TableCell>
                        <TableCell>{group.userName}</TableCell>
                        <TableCell>{formatCurrency(group.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(group.transactions[0].type)}>
                            {group.transactions[0].type}
                          </Badge>
                        </TableCell>
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
                              <TableCell>{transaction.quantity} item(s)</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(transaction.price)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesLog;
