
import React from 'react';
import { Product, Service } from '@/models/types';
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
  const { items, globalDiscount, globalCustomerName, updateQuantity, removeItem, clearCart } = useCart();
  const { recordBulkSale, recordServiceSale, recordMixedSale } = useData();
  const { toast } = useToast();
  
  // Separate items by type
  const productItems = items.filter(item => item.type === 'product');
  const serviceItems = items.filter(item => item.type === 'service');
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasProducts = productItems.length > 0;
  const hasServices = serviceItems.length > 0;
  const isMixed = hasProducts && hasServices;
  
  const handleCompleteSale = async (paymentMethod: string) => {
    if (items.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      if (isMixed) {
        // Mixed cart: both products and services
        const productSaleItems = productItems.map(item => ({
          product: item.item as Product,
          quantity: item.quantity,
          discount: globalDiscount / items.length // Distribute global discount across items
        }));
        
        const serviceSaleItems = serviceItems.map(item => ({
          service: item.item as Service,
          quantity: item.quantity,
          discount: globalDiscount / items.length,
          customerName: globalCustomerName,
          tip: 0, // No tip field in phase 3
          notes: '', // No notes field in phase 3
          serviceDate: new Date()
        }));
        
        await recordMixedSale(productSaleItems, serviceSaleItems, paymentMethod);
      } else if (hasProducts) {
        // Products only
        const saleItems = productItems.map(item => ({
          product: item.item as Product,
          quantity: item.quantity,
          discount: globalDiscount / items.length
        }));
        
        await recordBulkSale(saleItems, 0, paymentMethod);
      } else if (hasServices) {
        // Services only
        const serviceSaleItems = serviceItems.map(item => ({
          service: item.item as Service,
          quantity: item.quantity,
          discount: globalDiscount / items.length,
          customerName: globalCustomerName,
          tip: 0,
          notes: '',
          serviceDate: new Date()
        }));
        
        await recordServiceSale(serviceSaleItems, paymentMethod);
      }
      
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
            items={items}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            clearCart={clearCart}
            recordSale={handleCompleteSale}
            isProcessing={isProcessing}
            hasProducts={hasProducts}
            hasServices={hasServices}
            isMixed={isMixed}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesCart;
