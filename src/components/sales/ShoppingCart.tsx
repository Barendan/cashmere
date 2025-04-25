
import React from 'react';
import { Product } from '@/models/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import CartItem from '@/components/sales/CartItem';
import { Button } from '@/components/ui/button';
import { HoverFillButton } from '@/components/ui/hover-fill-button'; 
import { formatCurrency } from '@/lib/format';
import { Undo2 } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface ShoppingCartProps {
  items: CartItem[];
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  recordSale: () => void;
  isProcessing: boolean;
  undoLastTransaction?: () => void;
}

const ShoppingCart = ({
  items,
  updateQuantity,
  updateDiscount,
  removeItem,
  clearCart,
  recordSale,
  isProcessing,
  undoLastTransaction
}: ShoppingCartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const finalTotal = Math.max(0, subtotal - totalDiscount);
  
  return (
    <div className="h-full flex flex-col">
      
      {items.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <p>Your cart is empty</p>
            <p className="text-sm mt-1">Click on products to add them</p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-grow px-4 pt-4 pr-4">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem 
                  key={item.product.id}
                  product={item.product}
                  quantity={item.quantity}
                  maxQuantity={item.product.stockQuantity}
                  onIncrement={() => updateQuantity(item.product.id, item.quantity + 1)}
                  onDecrement={() => updateQuantity(item.product.id, item.quantity - 1)}
                  onRemove={() => removeItem(item.product.id)}
                  discount={item.discount}
                  onDiscountChange={(discount) => updateDiscount(item.product.id, discount)}
                />
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 mt-auto space-y-3 pt-3 border-t border-spa-sand/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span className="flex items-center">
                  Total Discounts
                </span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-medium border-t border-spa-sand/50 pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
            
            <HoverFillButton 
              className="w-full" 
              onClick={recordSale}
              disabled={isProcessing || items.length === 0}
            >
              {isProcessing ? "Processing..." : "Complete Sale"}
            </HoverFillButton>
            
            {/* <div className="grid grid-cols-2 gap-3 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={clearCart}
              >
                Clear All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="border-spa-sand"
                onClick={undoLastTransaction}
              >
                <Undo2 size={16} className="mr-2" />
                Undo Action
              </Button>
            </div> */}
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingCart;
