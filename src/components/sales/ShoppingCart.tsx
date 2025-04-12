
import React, { useState } from 'react';
import { Product } from '@/models/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import CartItem from '@/components/sales/CartItem';
import { Button } from '@/components/ui/button';
import { HoverFillButton } from '@/components/ui/hover-fill-button'; 
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Undo2, Percent } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

interface ShoppingCartProps {
  items: CartItem[];
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  recordSale: () => void;
  isProcessing: boolean;
  undoLastTransaction?: () => void;
  discount: number;
  setDiscount: (discount: number) => void;
}

const ShoppingCart = ({
  items,
  updateQuantity,
  removeItem,
  clearCart,
  recordSale,
  isProcessing,
  undoLastTransaction,
  discount,
  setDiscount
}: ShoppingCartProps) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  const finalTotal = Math.max(0, subtotal - discount);
  
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      setDiscount(0);
    } else {
      setDiscount(Math.min(value, subtotal)); // Ensure discount doesn't exceed subtotal
    }
  };
  
  // Calculate per-product discount distribution
  const getItemDiscount = (item: CartItem): number => {
    if (discount === 0 || subtotal === 0) return 0;
    
    // Distribute discount proportionally based on item's contribution to total
    const itemProportion = (item.product.sellPrice * item.quantity) / subtotal;
    const itemDiscount = discount * itemProportion;
    
    return Math.round(itemDiscount * 100) / 100; // Round to 2 decimal places
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-spa-sand/50">
        <h3 className="font-medium">
          Shopping Cart
        </h3>
        <span className="text-sm text-muted-foreground">{totalItems > 0 ? `${totalItems} items` : 'Empty'}</span>
      </div>
      
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
                  discount={getItemDiscount(item)}
                />
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 mt-auto space-y-3 pt-3 border-t border-spa-sand/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount" className="text-sm">
                Discount Amount ($)
              </Label>
              <Input 
                id="discount"
                type="number"
                min="0"
                step="1"
                value={discount || ''}
                onChange={handleDiscountChange}
                className="h-8 text-sm" 
                placeholder="Enter discount amount"
              />
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span className="flex items-center">
                  <Percent size={14} className="mr-1" />
                  Discount
                </span>
                <span>-{formatCurrency(discount)}</span>
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
            
            <div className="grid grid-cols-2 gap-3 mt-3">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingCart;
