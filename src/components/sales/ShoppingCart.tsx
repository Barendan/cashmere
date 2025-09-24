
import React, { useState } from 'react';
import { Product, Service } from '@/models/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import CartItem from '@/components/sales/CartItem';
import { Button } from '@/components/ui/button';
import { HoverFillButton } from '@/components/ui/hover-fill-button'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format';
import { Undo2, Package, Star, ShoppingBag, Percent, User } from 'lucide-react';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import { CartItem as CartItemType } from '@/contexts/CartContext';

interface ShoppingCartProps {
  items: CartItemType[];
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDiscount: (itemId: string, discount: number) => void;
  updateServiceFields: (itemId: string, fields: { customerName?: string; tip?: number; notes?: string; serviceDate?: Date }) => void;
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
  updateDiscount,
  updateServiceFields,
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
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalCustomerName, setGlobalCustomerName] = useState<string>('');
  
  // Calculate totals including both products and services
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.type === 'product' 
      ? (item.item as Product).sellPrice 
      : (item.item as Service).price;
    return sum + (itemPrice * item.quantity);
  }, 0);
  
  // For Phase 2: Use global discount instead of per-item discounts
  // Keep the old calculation for backward compatibility but prioritize global discount
  const totalDiscount = globalDiscount > 0 ? globalDiscount : items.reduce((sum, item) => sum + item.discount, 0);
  const totalTip = items.reduce((sum, item) => {
    return sum + (item.type === 'service' ? (item.tip || 0) : 0);
  }, 0);
  
  const finalTotal = Math.max(0, subtotal - totalDiscount + totalTip);
  
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      setGlobalDiscount(0);
    } else {
      setGlobalDiscount(Math.min(value, subtotal)); // Ensure discount doesn't exceed subtotal
    }
  };
  
  const handleCompleteSale = () => {
    if (!paymentMethod) {
      return; // Don't proceed without payment method
    }
    recordSale(paymentMethod);
  };
  
  return (
    <div className="h-full flex flex-col">
      
      {items.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <p>Your cart is empty</p>
            <p className="text-sm mt-1">Click on products or services to add them</p>
          </div>
        </div>
      ) : (
        <>
          {/* Cart Type Indicator */}
          {isMixed && (
            <div className="px-4 pt-2 pb-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-2 rounded-md">
                <ShoppingBag className="h-4 w-4" />
                <span>Mixed Cart: Products & Services</span>
              </div>
            </div>
          )}
          
          <ScrollArea className="flex-grow px-4 pt-4 pr-4">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem
                  key={item.item.id}
                  item={item.item}
                  type={item.type}
                  quantity={item.quantity}
                  maxQuantity={item.type === 'product' ? (item.item as Product).stockQuantity : undefined}
                  onIncrement={() => updateQuantity(item.item.id, item.quantity + 1)}
                  onDecrement={() => updateQuantity(item.item.id, item.quantity - 1)}
                  onRemove={() => removeItem(item.item.id)}
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
            
            {totalTip > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center">
                  Total Tips
                </span>
                <span>+{formatCurrency(totalTip)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-medium border-t border-spa-sand/50 pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
            
            
            {/* Cart Summary Section */}
            <div className="space-y-3 border-t border-spa-sand/50 pt-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Cart Summary</span>
              </div>
              
              {/* Global Discount Input */}
              <div className="space-y-1">
                <Label htmlFor="global-discount" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Discount (applies to entire cart)
                </Label>
                <Input
                  id="global-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={subtotal}
                  value={globalDiscount || ''}
                  onChange={handleGlobalDiscountChange}
                  className="h-8"
                  placeholder="0.00"
                />
              </div>
              
              {/* Customer Name Input - only shown when cart has services */}
              {hasServices && (
                <div className="space-y-1">
                  <Label htmlFor="global-customer" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Customer Name
                  </Label>
                  <Input
                    id="global-customer"
                    type="text"
                    value={globalCustomerName}
                    onChange={(e) => setGlobalCustomerName(e.target.value)}
                    className="h-8"
                    placeholder="Enter customer name"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <HoverFillButton 
                className="w-full" 
                onClick={handleCompleteSale}
                disabled={isProcessing || items.length === 0 || !paymentMethod}
              >
                {isProcessing ? "Processing..." : `Complete ${isMixed ? 'Mixed ' : hasServices ? 'Service ' : ''}Sale`}
              </HoverFillButton>
            </div>
            
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
