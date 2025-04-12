
import React from 'react';
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
  const { recordBulkSale, undoLastTransaction } = useData();
  const { toast } = useToast();
  
  const handleCompleteSale = async () => {
    if (items.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      await recordBulkSale(items);
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
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-spa-deep">Shopping Cart</CardTitle>
        <CardDescription>Review and complete sale</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-6 pt-0 overflow-hidden h-[calc(100%-85px)]">
        <div className="flex-grow flex flex-col h-full">
          <ShoppingCart 
            items={items}
            updateQuantity={updateQuantity}
            updateDiscount={updateDiscount}
            removeItem={removeItem}
            clearCart={clearCart}
            recordSale={handleCompleteSale}
            isProcessing={isProcessing}
            undoLastTransaction={undoLastTransaction}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesCart;
