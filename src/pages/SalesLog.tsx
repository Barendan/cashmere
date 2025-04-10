
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
import { Undo2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import usePageTitle from "@/hooks/usePageTitle";
import ShoppingCart from "@/components/sales/ShoppingCart";
import ProductCard from "@/components/sales/ProductCard";
import { formatDate } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, transactions, recordBulkSale, undoLastTransaction } = useData();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Filter products that have stock
  const availableProducts = products
    .filter((product) => product.stockQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Handle adding item to cart
  const handleAddToCart = (product: Product) => {
    // Check if product is already in cart
    const existingItem = cartItems.find(item => item.product.id === product.id);
    if (existingItem) return;
    
    // Add to cart with quantity 1
    setCartItems([...cartItems, { product, quantity: 1 }]);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };
  
  // Handle updating item quantity
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Make sure quantity doesn't exceed stock
    const safeQuantity = Math.min(quantity, product.stockQuantity);
    
    setCartItems(cartItems.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: safeQuantity }
        : item
    ));
  };
  
  // Handle removing item from cart
  const handleRemoveItem = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product.id !== productId));
  };
  
  // Clear the entire cart
  const handleClearCart = () => {
    setCartItems([]);
  };
  
  // Complete the sale by processing all items in cart
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Process all items in a single transaction
      await recordBulkSale(cartItems);
      
      // Clear cart after successful sale
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

  const filteredTransactions = transactions.filter((transaction) => {
    if (filterType !== "all" && transaction.type !== filterType) return false;
    
    // Apply search filter if search term exists
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return transaction.productName.toLowerCase().includes(searchLower) ||
             transaction.userName.toLowerCase().includes(searchLower);
    }
    return true;
  });

  // Check if product is in cart
  const isProductInCart = (productId: string) => {
    return cartItems.some(item => item.product.id === productId);
  };
  
  // Filter products based on search term
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

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Product and Cart Section - Tall enough to fill most of the screen */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 h-[calc(75vh)]">
        <Card className="lg:col-span-3 bg-white h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-spa-deep">Available Products</CardTitle>
            <CardDescription>Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col pb-6 overflow-hidden">
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
            
            <ScrollArea className="flex-grow pr-4 h-full">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isInCart={isProductInCart(product.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground h-full flex items-center justify-center">
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
        
        <Card className="lg:col-span-2 bg-white h-full flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-spa-deep">Shopping Cart</CardTitle>
            <CardDescription>Review and complete sale</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col pb-6 overflow-hidden">
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
            
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-spa-sand w-full"
                onClick={() => undoLastTransaction()}
              >
                <Undo2 size={16} className="mr-2" />
                Undo Last Action
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Log Section - Takes remaining space */}
      <Card className="bg-white mb-6 flex-shrink-0">
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
                  <TableHead>Product</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, index) => (
                    <TableRow key={transaction.id} className={index % 2 === 0 ? "" : "bg-gray-50"}>
                      <TableCell className="text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.productName}
                      </TableCell>
                      <TableCell>{transaction.userName}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${transaction.price.toFixed(2)}
                      </TableCell>
                    </TableRow>
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
