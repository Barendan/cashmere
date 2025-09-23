
import React, { useState } from 'react';
import { Product, Service } from '@/models/types';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle, Trash2, Percent, Star, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CartItemProps {
  item: Product | Service;
  type: 'product' | 'service';
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  maxQuantity?: number; // Optional for services
  discount: number;
  onDiscountChange: (discount: number) => void;
  // Service-specific props
  customerName?: string;
  tip?: number;
  notes?: string;
  serviceDate?: Date;
  onServiceFieldChange?: (fields: { customerName?: string; tip?: number; notes?: string; serviceDate?: Date }) => void;
}

const CartItem = ({ 
  item, 
  type,
  quantity, 
  onIncrement, 
  onDecrement, 
  onRemove, 
  maxQuantity,
  discount,
  onDiscountChange,
  customerName = '',
  tip = 0,
  notes = '',
  serviceDate,
  onServiceFieldChange
}: CartItemProps) => {
  const itemPrice = type === 'product' 
    ? (item as Product).sellPrice 
    : (item as Service).price;
  const itemTotal = itemPrice * quantity;
  const discountedTotal = Math.max(0, itemTotal - discount);
  const hasDiscount = discount > 0;
  
  const isProduct = type === 'product';
  const isService = type === 'service';
  
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      onDiscountChange(0);
    } else {
      onDiscountChange(Math.min(value, itemTotal)); // Ensure discount doesn't exceed item total
    }
  };
  
  const handleServiceFieldChange = (field: string, value: any) => {
    if (onServiceFieldChange) {
      onServiceFieldChange({ [field]: value });
    }
  };
  
  return (
    <div className="p-3 border border-spa-sand rounded-md flex flex-col bg-white h-auto min-h-[88px]">
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium text-spa-deep text-sm truncate mr-2 flex-grow flex items-center">
          {isProduct ? (
            <Package className="h-4 w-4 mr-2 text-spa-sage" />
          ) : (
            <Star className="h-4 w-4 mr-2 text-spa-sage" />
          )}
          {item.name}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            type="button" 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6" 
            onClick={onDecrement} 
            disabled={quantity <= 1}
          >
            <MinusCircle size={14} />
          </Button>
          
          <span className="w-5 text-center font-medium text-sm">{quantity}</span>
          
          <Button 
            type="button" 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6" 
            onClick={onIncrement} 
            disabled={isProduct && maxQuantity ? quantity >= maxQuantity : false}
          >
            <PlusCircle size={14} />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {formatCurrency(itemPrice)} each
          </div>
          
          <div className="flex items-center gap-2">
            {hasDiscount ? (
              <div className="flex flex-col items-end">
                <div className="text-sm line-through text-muted-foreground">
                  {formatCurrency(itemTotal)}
                </div>
                <div className="flex items-center">
                  <Percent className="h-3 w-3 text-red-500 mr-0.5" />
                  <span className="text-sm font-semibold text-red-500">
                    {formatCurrency(discountedTotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold text-spa-deep">
                {formatCurrency(itemTotal)}
              </div>
            )}
            
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" 
              onClick={onRemove}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor={`discount-${item.id}`} className="text-xs text-muted-foreground flex-shrink-0">
            Discount:
          </Label>
          <Input
            id={`discount-${item.id}`}
            type="number"
            min="0"
            step="1"
            value={discount || ''}
            onChange={handleDiscountChange}
            className="h-6 text-xs py-1 px-2"
            placeholder="0.00"
          />
        </div>
        
        {/* Service-specific fields */}
        {isService && (
          <div className="space-y-2 mt-2 pt-2 border-t border-spa-sand/50">
            <div className="flex items-center gap-2">
              <Label htmlFor={`customer-${item.id}`} className="text-xs text-muted-foreground flex-shrink-0">
                Customer:
              </Label>
              <Input
                id={`customer-${item.id}`}
                type="text"
                value={customerName}
                onChange={(e) => handleServiceFieldChange('customerName', e.target.value)}
                className="h-6 text-xs py-1 px-2"
                placeholder="Customer name"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor={`tip-${item.id}`} className="text-xs text-muted-foreground flex-shrink-0">
                Tip:
              </Label>
              <Input
                id={`tip-${item.id}`}
                type="number"
                min="0"
                step="1"
                value={tip || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  handleServiceFieldChange('tip', isNaN(value) ? 0 : Math.max(0, value));
                }}
                className="h-6 text-xs py-1 px-2"
                placeholder="0.00"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <Label htmlFor={`notes-${item.id}`} className="text-xs text-muted-foreground">
                Notes:
              </Label>
              <Textarea
                id={`notes-${item.id}`}
                value={notes}
                onChange={(e) => handleServiceFieldChange('notes', e.target.value)}
                className="text-xs resize-none"
                rows={2}
                placeholder="Service notes..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartItem;
