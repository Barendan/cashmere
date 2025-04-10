
import React from 'react';
import { Product } from '@/models/types';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface CartItemProps {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  maxQuantity: number;
}

const CartItem = ({ 
  product, 
  quantity, 
  onIncrement, 
  onDecrement, 
  onRemove, 
  maxQuantity 
}: CartItemProps) => {
  return (
    <div className="p-3 border border-spa-sand rounded-md flex flex-col bg-white h-[88px]">
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
      
      <div className="flex justify-between items-center mt-auto">
        <div className="text-xs text-muted-foreground">
          {formatCurrency(product.sellPrice)} each
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-spa-deep">
            {formatCurrency(product.sellPrice * quantity)}
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
