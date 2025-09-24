
import React from 'react';
import { Product, Service } from '@/models/types';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle, Trash2, Star, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface CartItemProps {
  item: Product | Service;
  type: 'product' | 'service';
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  maxQuantity?: number; // Optional for services
}

const CartItem = ({ 
  item, 
  type,
  quantity, 
  onIncrement, 
  onDecrement, 
  onRemove, 
  maxQuantity
}: CartItemProps) => {
  const itemPrice = type === 'product' 
    ? (item as Product).sellPrice 
    : (item as Service).price;
  const itemTotal = itemPrice * quantity;
  
  const isProduct = type === 'product';
  
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
      
      <div className="flex justify-between items-center mt-1">
        <div className="text-xs text-muted-foreground">
          {formatCurrency(itemPrice)} each
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-spa-deep">
            {formatCurrency(itemTotal)}
          </div>
          
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
    </div>
  );
};

export default CartItem;
