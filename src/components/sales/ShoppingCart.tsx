import React, { useState, useEffect } from 'react';
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
  recordSale: (paymentMethod?: string, cashAmount?: number) => void;
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
    globalTip,
    globalCustomerName,
    globalCashAmount,
    updateGlobalDiscount,
    updateGlobalTip,
    updateGlobalCustomerName,
    updateGlobalCashAmount,
    getSubtotal,
    getTotalDiscount,
    getTotalTip,
    getFinalTotal
  } = useCart();

  // Use cart context functions for calculations
  const subtotal = getSubtotal();
  const totalDiscount = getTotalDiscount();
  const totalTip = getTotalTip();
  const finalTotal = getFinalTotal();
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      updateGlobalDiscount(0);
    } else {
      updateGlobalDiscount(Math.min(value, subtotal)); // Ensure discount doesn't exceed subtotal
    }
  };

  const handleGlobalTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      updateGlobalTip(0);
    } else {
      updateGlobalTip(value);
    }
  };

  const handleCashAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip dollar signs, commas, and other non-numeric characters except decimal point
    const cleanedValue = e.target.value.replace(/[^0-9.]/g, '');
    const value = cleanedValue === '' ? 0 : parseFloat(cleanedValue);
    if (isNaN(value) || value < 0) {
      updateGlobalCashAmount(0);
    } else {
      updateGlobalCashAmount(Math.min(value, finalTotal)); // Ensure cash amount doesn't exceed total
    }
  };

  // Reset cash amount when payment method changes to 'cash'
  useEffect(() => {
    if (paymentMethod === 'cash') {
      updateGlobalCashAmount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  const handleCompleteSale = () => {
    if (!paymentMethod) {
      return; // Don't proceed without payment method
    }
    recordSale(paymentMethod, globalCashAmount);
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
            {/* Discount and Tip on one line */}
            <div className="grid grid-cols-2 gap-3 mb-1 mt-4">
              {/* Global Tip Input - only shown when cart has services */}
              {hasServices ? (
                <div className="space-y-1">
                  <label htmlFor="global-tip" className="text-sm text-muted-foreground">
                    Tip
                  </label>
                  <Input 
                    id="global-tip" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={globalTip || ''} 
                    onChange={handleGlobalTipChange} 
                    placeholder="0.00" 
                    className="text-right"
                  />
                </div>
              ) : (
                <div />
              )}
              
              <div className="space-y-1">
                <label htmlFor="global-discount" className="text-sm text-muted-foreground">
                  Discount
                </label>
                <Input 
                  id="global-discount" 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  max={subtotal} 
                  value={globalDiscount || ''} 
                  onChange={handleGlobalDiscountChange} 
                  placeholder="0.00" 
                  className="text-right"
                />
              </div>
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
            
            {totalTip > 0 && <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center">
                  Tip
                </span>
                <span className="mr-3 ">+{formatCurrency(totalTip)}</span>
              </div>}
            
            <div className="flex justify-between font-medium border-t border-spa-sand/70 pt-2 mt-2">
              <span>Total</span>
              <span className="mr-2 ">{formatCurrency(finalTotal)}</span>
            </div>
            
            <div className="space-y-3 border-t border-spa-sand/100 pt-3">
              
              
              {/* Payment Method and Cash Amount on one line */}
              <div className="grid grid-cols-2 gap-3">
                {/* Cash Amount Input - shown when payment method is selected and not 'cash' */}
                {paymentMethod && paymentMethod !== 'cash' ? (
                  <div>
                    <input 
                      id="cash-amount" 
                      type="text" 
                      value={globalCashAmount > 0 ? globalCashAmount.toString() : ''}
                      onChange={handleCashAmountChange}
                      placeholder="Cash Split" 
                      className="bg-background border border-input rounded-md py-2 px-3 text-right text-sm w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {globalCashAmount > 0 && (
                      <span className="text-xs text-muted-foreground block mt-1">
                        ({formatCurrency(finalTotal - globalCashAmount)} via {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label})
                      </span>
                    )}
                    {globalCashAmount > finalTotal && (
                      <p className="text-xs text-red-600 mt-1">Cash amount cannot exceed total</p>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <div className="space-y-1">
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
              </div>
              
              {/* Customer Name Input - only shown when cart has services */}
              {hasServices && <div className="space-y-1">
                <Input id="global-customer" type="text" value={globalCustomerName} onChange={e => updateGlobalCustomerName(e.target.value)} placeholder="Enter customer name" />
              </div>}

              <HoverFillButton className="w-full" onClick={handleCompleteSale} disabled={isProcessing || items.length === 0 || !paymentMethod}>
                {isProcessing ? "Processing..." : `Complete ${isMixed ? 'Mixed ' : hasServices ? 'Service ' : ''}Sale`}
              </HoverFillButton>
            </div>
          </div>
        </>}
    </div>;
};
export default ShoppingCart;