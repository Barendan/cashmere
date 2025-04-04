
import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { Product, Transaction } from "../models/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsItem, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Undo2, PlusCircle, MinusCircle } from "lucide-react";

const SalesLog = () => {
  const { products, transactions, recordSale, undoLastTransaction } = useData();
  const { isAdmin } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>("all");

  // Sort products alphabetically and filter out of stock products
  const inStockProducts = [...products]
    .filter((product) => product.stockQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSale = () => {
    if (selectedProductId && quantity > 0) {
      recordSale(selectedProductId, quantity);
      setSelectedProductId("");
      setQuantity(1);
    }
  };

  // Filter transactions based on selected type
  const filteredTransactions = transactions.filter((transaction) => {
    if (filterType === "all") return true;
    return transaction.type === filterType;
  });

  const formatDate = (date: Date) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
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

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const maxQuantity = selectedProduct ? selectedProduct.stockQuantity : 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sale Entry Form */}
        <Card className="lg:col-span-2 bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Record Sale</CardTitle>
            <CardDescription>Enter product sale details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="border-spa-sand">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Products</SelectLabel>
                      {inStockProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.stockQuantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-spa-sand"
                    disabled={!selectedProductId || quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    <MinusCircle size={18} />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    min={1}
                    max={maxQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= maxQuantity) {
                        setQuantity(val);
                      }
                    }}
                    className="text-center border-spa-sand"
                    disabled={!selectedProductId}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-spa-sand"
                    disabled={!selectedProductId || quantity >= maxQuantity}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <PlusCircle size={18} />
                  </Button>
                </div>
                {selectedProductId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {maxQuantity} available
                  </p>
                )}
              </div>
            </div>

            {/* Sale Summary */}
            {selectedProductId && selectedProduct && (
              <div className="mt-6 p-4 border border-spa-sand rounded-md bg-spa-cream/30">
                <h3 className="font-medium mb-2">Sale Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Product:</div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div>Price per Item:</div>
                  <div className="font-medium">${selectedProduct.sellPrice.toFixed(2)}</div>
                  <div>Quantity:</div>
                  <div className="font-medium">{quantity}</div>
                  <div>Total:</div>
                  <div className="font-medium text-lg text-spa-deep">
                    ${(selectedProduct.sellPrice * quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                className="border-spa-sand"
                onClick={() => undoLastTransaction()}
              >
                <Undo2 size={16} className="mr-2" />
                Undo Last Action
              </Button>
              <Button
                type="button"
                className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
                onClick={handleSale}
                disabled={!selectedProductId || quantity <= 0}
              >
                Record Sale
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-spa-deep">Today's Activity</CardTitle>
            <CardDescription>Summary for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Today's Sales */}
              <div className="p-4 bg-spa-sage/10 rounded-md">
                <div className="text-sm text-muted-foreground">Total Sales Today</div>
                <div className="text-2xl font-medium mt-1">
                  ${transactions
                    .filter(
                      (t) =>
                        t.type === "sale" &&
                        new Date(t.date).toDateString() === new Date().toDateString()
                    )
                    .reduce((sum, t) => sum + t.price, 0)
                    .toFixed(2)}
                </div>
              </div>

              {/* Items Sold */}
              <div className="p-4 bg-spa-water/10 rounded-md">
                <div className="text-sm text-muted-foreground">Items Sold Today</div>
                <div className="text-2xl font-medium mt-1">
                  {transactions
                    .filter(
                      (t) =>
                        t.type === "sale" &&
                        new Date(t.date).toDateString() === new Date().toDateString()
                    )
                    .reduce((sum, t) => sum + t.quantity, 0)}
                </div>
              </div>

              {/* Recent Products */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Recently Sold Products</h3>
                <div className="space-y-2">
                  {transactions
                    .filter((t) => t.type === "sale")
                    .slice(0, 3)
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-2 border border-spa-sand rounded-md flex justify-between items-center"
                      >
                        <div className="text-sm truncate">{transaction.productName}</div>
                        <Badge variant="outline" className="text-xs">
                          {transaction.quantity} sold
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Log */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-spa-deep">Sales & Inventory Log</CardTitle>
              <CardDescription>History of all transactions</CardDescription>
            </div>
            <Tabs defaultValue="all" onValueChange={setFilterType} className="w-[400px]">
              <TabsList className="grid grid-cols-4">
                <TabsItem value="all">All</TabsItem>
                <TabsItem value="sale">Sales</TabsItem>
                <TabsItem value="restock">Restocks</TabsItem>
                <TabsItem value="adjustment">Adjustments</TabsItem>
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
