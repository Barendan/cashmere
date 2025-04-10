
import React from 'react';
import { Product } from '@/models/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import CartItem from '@/components/sales/CartItem';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { ShoppingCart as CartIcon } from 'lucide-react';

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
}

const ShoppingCart = ({
  items,
  updateQuantity,
  removeItem,
  clearCart,
  recordSale,
  isProcessing
}: ShoppingCartProps) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  
  return (
    <div className="h-full flex flex-col p-4 border border-spa-sand rounded-md bg-spa-cream/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <CartIcon size={18} className="mr-2" />
          Shopping Cart {totalItems > 0 && <span className="ml-2 text-sm text-muted-foreground">({totalItems} items)</span>}
        </h3>
        {items.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={clearCart}
          >
            Clear All
          </Button>
        )}
      </div>
      
      {items.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>Your cart is empty</p>
            <p className="text-sm mt-1">Add products to get started</p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-grow mb-4 pr-4 max-h-full">
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
                />
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-auto space-y-3 pt-3 border-t border-spa-sand/50">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <Button 
              className="w-full bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
              onClick={recordSale}
              disabled={isProcessing || items.length === 0}
            >
              {isProcessing ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingCart;
