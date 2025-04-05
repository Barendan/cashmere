
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

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, transactions, recordSale, undoLastTransaction } = useData();
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
      // Process each item in cart
      for (const item of cartItems) {
        await recordSale(item.product.id, item.quantity);
      }
      
      // Clear cart after successful sale
      setCartItems([]);
      toast({
        title: "Sale completed",
        description: `Successfully processed ${cartItems.length} product${cartItems.length > 1 ? 's' : ''}`,
      });
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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Available Products</CardTitle>
            <CardDescription>Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
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
            
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="text-center py-8 text-muted-foreground">
                <p>No products found</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 
                    "Try a different search term" : 
                    "There are no products with available stock"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Shopping Cart</CardTitle>
            <CardDescription>Review and complete sale</CardDescription>
          </CardHeader>
          <CardContent>
            <ShoppingCart 
              items={cartItems}
              updateQuantity={handleUpdateQuantity}
              removeItem={handleRemoveItem}
              clearCart={handleClearCart}
              recordSale={handleCompleteSale}
              isProcessing={isProcessing}
            />
            
            <div className="mt-6">
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
      
      <Card className="bg-white">
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
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
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
