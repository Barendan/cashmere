
import React from 'react';
import { Product } from '@/models/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ShoppingCart from './ShoppingCart';
import { useCart } from '@/contexts/CartContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

interface SalesCartProps {
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

const SalesCart = ({ isProcessing, setIsProcessing }: SalesCartProps) => {
  const { items, updateQuantity, updateDiscount, removeItem, clearCart } = useCart();
  const { recordBulkSale } = useData();
  const { toast } = useToast();
  
  // Filter only product items for display
  const productItems = items.filter(item => item.type === 'product');
  const totalItems = productItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const handleCompleteSale = async (paymentMethod: string) => {
    if (productItems.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Convert cart items to the format expected by recordBulkSale
      const saleItems = productItems.map(item => ({
        product: item.item as Product,
        quantity: item.quantity,
        discount: item.discount
      }));
      
      await recordBulkSale(saleItems, 0, paymentMethod);
      clearCart();
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
  
  return (
    <Card className="lg:col-span-2 flex flex-col overflow-hidden h-full">
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="text-spa-deep">Shopping Cart</CardTitle>
        <CardDescription className="flex justify-between">Review and complete sale
          <span className="text-sm text-muted-foreground items-end">{totalItems > 0 ? `${totalItems} items` : 'Empty'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-6 pt-0 overflow-hidden h-[calc(100%-85px)]">
        <div className="flex-grow flex flex-col h-full">
          <ShoppingCart 
            items={productItems.map(item => ({
              product: item.item as Product,
              quantity: item.quantity,
              discount: item.discount
            }))}
            updateQuantity={updateQuantity}
            updateDiscount={updateDiscount}
            removeItem={removeItem}
            clearCart={clearCart}
            recordSale={handleCompleteSale}
            isProcessing={isProcessing}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesCart;
