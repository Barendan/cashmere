
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/models/types";
import { AlertTriangle, Check, Package, XCircle } from "lucide-react";
import { formatCurrency } from '@/lib/format';

interface MonthlyRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRestock: (restockData: { productId: string; newQuantity: number }[]) => void;
}

const MonthlyRestockModal = ({ isOpen, onClose, products, onRestock }: MonthlyRestockModalProps) => {
  const [restockData, setRestockData] = useState<Map<string, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Initialize with current quantities
  useEffect(() => {
    const newRestockData = new Map<string, number>();
    products.forEach(product => {
      const suggestedRestock = product.stockQuantity < product.lowStockThreshold 
        ? product.lowStockThreshold * 3 - product.stockQuantity 
        : 0;
      newRestockData.set(product.id, suggestedRestock);
    });
    setRestockData(newRestockData);
  }, [products]);

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newRestockData = new Map(restockData);
    newRestockData.set(productId, quantity);
    setRestockData(newRestockData);
  };

  const handleSubmit = () => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      // Filter out products with zero restock quantity
      const restockItems = Array.from(restockData.entries())
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => {
          const product = products.find(p => p.id === productId);
          return {
            productId,
            newQuantity: (product?.stockQuantity || 0) + quantity
          };
        });
      
      if (restockItems.length === 0) {
        setErrorMessage("Please specify at least one product to restock");
        setIsLoading(false);
        return;
      }
      
      onRestock(restockItems);
    } catch (error) {
      console.error("Error preparing restock data:", error);
      setErrorMessage("An error occurred while preparing the restock data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by low stock first, then by name
      const aIsLowStock = a.stockQuantity <= a.lowStockThreshold;
      const bIsLowStock = b.stockQuantity <= b.lowStockThreshold;
      
      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;
      return a.name.localeCompare(b.name);
    });

  const getTotalCost = () => {
    return Array.from(restockData.entries()).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return total + (product?.costPrice || 0) * quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return Array.from(restockData.values()).reduce((total, quantity) => total + quantity, 0);
  };

  const getRestockItemsCount = () => {
    return Array.from(restockData.entries()).filter(([_, quantity]) => quantity > 0).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Monthly Inventory Restock</DialogTitle>
          <DialogDescription>
            Review and update inventory levels for all products
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground">
              {filteredProducts.filter(p => p.stockQuantity <= p.lowStockThreshold).length} products low on stock
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Total Restock Cost:</span>
              <span className="text-spa-deep">{formatCurrency(getTotalCost())}</span>
            </div>
          </div>
          
          <Input 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <ScrollArea className="flex-grow">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Restock Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => {
                    const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                    const isOutOfStock = product.stockQuantity === 0;
                    const restockQty = restockData.get(product.id) || 0;
                    const rowCost = product.costPrice * restockQty;
                    
                    return (
                      <TableRow 
                        key={product.id}
                        className={
                          isOutOfStock 
                            ? "bg-red-50 hover:bg-red-100" 
                            : isLowStock
                              ? "bg-amber-50 hover:bg-amber-100"
                              : index % 2 === 0 
                                ? "bg-white hover:bg-gray-100" 
                                : "bg-gray-50 hover:bg-gray-100"
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {product.name}
                            {isOutOfStock && (
                              <Badge 
                                variant="outline" 
                                className="bg-red-50 text-red-800 border-red-200 ml-2"
                              >
                                Out of Stock
                              </Badge>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <Badge 
                                variant="outline" 
                                className="bg-amber-50 text-amber-800 border-amber-200 ml-2"
                              >
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {product.stockQuantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={restockQty}
                            onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(rowCost)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No products found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}
        
        <DialogFooter className="mt-6 flex justify-between items-center">
          <div className="text-sm flex items-center">
            <Package className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-muted-foreground">
              {getRestockItemsCount()} products selected for restock ({getTotalItems()} items total)
            </span>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || getRestockItemsCount() === 0}
              className="min-w-[120px]"
            >
              {isLoading ? "Processing..." : "Confirm Restock"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyRestockModal;
