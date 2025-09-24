import React, { useState } from 'react';
import { Product, Service } from '@/models/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import CartItem from '@/components/sales/CartItem';
import { HoverFillButton } from '@/components/ui/hover-fill-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { ShoppingBag } from 'lucide-react';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import { CartItem as CartItemType, useCart } from '@/contexts/CartContext';
interface ShoppingCartProps {
  items: CartItemType[];
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  recordSale: (paymentMethod?: string) => void;
  isProcessing: boolean;
  hasProducts: boolean;
  hasServices: boolean;
  isMixed: boolean;
  undoLastTransaction?: () => void;
}
const ShoppingCart = ({
  items,
  updateQuantity,
  removeItem,
  clearCart,
  recordSale,
  isProcessing,
  hasProducts,
  hasServices,
  isMixed,
  undoLastTransaction
}: ShoppingCartProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const {
    globalDiscount,
    globalCustomerName,
    updateGlobalDiscount,
    updateGlobalCustomerName
  } = useCart();

  // Calculate totals including both products and services
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.type === 'product' ? (item.item as Product).sellPrice : (item.item as Service).price;
    return sum + itemPrice * item.quantity;
  }, 0);

  // Use global discount from cart context
  const totalDiscount = globalDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      updateGlobalDiscount(0);
    } else {
      updateGlobalDiscount(Math.min(value, subtotal)); // Ensure discount doesn't exceed subtotal
    }
  };
  const handleCompleteSale = () => {
    if (!paymentMethod) {
      return; // Don't proceed without payment method
    }
    recordSale(paymentMethod);
  };
  return <div className="h-full flex flex-col">
      
      {items.length === 0 ? <div className="flex-grow flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <p>Your cart is empty</p>
            <p className="text-sm mt-1">Click on products or services to add them</p>
          </div>
        </div> : <>
          {/* Cart Type Indicator */}
          {isMixed && <div className="px-4 pt-2 pb-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-2 rounded-md">
                <ShoppingBag className="h-4 w-4" />
                <span>Mixed Cart: Products & Services</span>
              </div>
            </div>}
          
          <ScrollArea className="flex-grow px-4 pt-4 pr-4">
            <div className="space-y-3">
              {items.map(item => <CartItem key={item.item.id} item={item.item} type={item.type} quantity={item.quantity} maxQuantity={item.type === 'product' ? (item.item as Product).stockQuantity : undefined} onIncrement={() => updateQuantity(item.item.id, item.quantity + 1)} onDecrement={() => updateQuantity(item.item.id, item.quantity - 1)} onRemove={() => removeItem(item.item.id)} />)}
            </div>
          </ScrollArea>
          
          <div className="p-4 mt-auto space-y-3 pt-3 border-t border-spa-sand/50">
            {/* Global Discount Input - styled like subtotal/total */}
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Discount</span>
              <input id="global-discount" type="number" min="0" step="0.01" max={subtotal} value={globalDiscount || ''} onChange={handleGlobalDiscountChange} placeholder="0.00" className="bg-background border border-input rounded-md py-1 text-right text-sm w-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="mr-3 \n">{formatCurrency(subtotal)}</span>
            </div>
            
            {totalDiscount > 0 && <div className="flex justify-between text-sm text-red-600">
                <span className="flex items-center">
                  Total Discounts
                </span>
                <span className="mr-3 ">-{formatCurrency(totalDiscount)}</span>
              </div>}
            
            <div className="flex justify-between font-medium border-t border-spa-sand/50 pt-2 mt-2">
              <span>Total</span>
              <span className="mr-2 ">{formatCurrency(finalTotal)}</span>
            </div>
            
            <div className="space-y-3 border-t border-spa-sand/50 pt-3">
              {/* Customer Name Input - only shown when cart has services */}
              {hasServices && <div className="space-y-1">
                  <Input id="global-customer" type="text" value={globalCustomerName} onChange={e => updateGlobalCustomerName(e.target.value)} placeholder="Enter customer name" />
                </div>}
              
              <div className="space-y-2">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <HoverFillButton className="w-full" onClick={handleCompleteSale} disabled={isProcessing || items.length === 0 || !paymentMethod}>
                {isProcessing ? "Processing..." : `Complete ${isMixed ? 'Mixed ' : hasServices ? 'Service ' : ''}Sale`}
              </HoverFillButton>
            </div>
          </div>
        </>}
    </div>;
};
export default ShoppingCart;