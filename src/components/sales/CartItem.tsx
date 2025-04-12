
import React, { useState } from 'react';
import { Product } from '@/models/types';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle, Trash2, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CartItemProps {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  maxQuantity: number;
  discount: number;
  onDiscountChange: (discount: number) => void;
}

const CartItem = ({ 
  product, 
  quantity, 
  onIncrement, 
  onDecrement, 
  onRemove, 
  maxQuantity,
  discount,
  onDiscountChange
}: CartItemProps) => {
  const itemTotal = product.sellPrice * quantity;
  const discountedTotal = Math.max(0, itemTotal - discount);
  const hasDiscount = discount > 0;
  
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      onDiscountChange(0);
    } else {
      onDiscountChange(Math.min(value, itemTotal)); // Ensure discount doesn't exceed item total
    }
  };
  
  return (
    <div className="p-3 border border-spa-sand rounded-md flex flex-col bg-white h-auto min-h-[88px]">
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium text-spa-deep text-sm truncate mr-2 flex-grow">
          {product.name}
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
            disabled={quantity >= maxQuantity}
          >
            <PlusCircle size={14} />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {formatCurrency(product.sellPrice)} each
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
          <Label htmlFor={`discount-${product.id}`} className="text-xs text-muted-foreground flex-shrink-0">
            Discount:
          </Label>
          <Input
            id={`discount-${product.id}`}
            type="number"
            min="0"
            step="1"
            value={discount || ''}
            onChange={handleDiscountChange}
            className="h-6 text-xs py-1 px-2"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );
};

export default CartItem;
