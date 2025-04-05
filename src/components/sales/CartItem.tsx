
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
    <div className="py-2 px-3 border border-spa-sand rounded-md flex items-center gap-4 bg-white">
      <div className="flex-1">
        <div className="font-medium">{product.name}</div>
        <div className="text-sm text-muted-foreground">{formatCurrency(product.sellPrice)} each</div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7" 
          onClick={onDecrement} 
          disabled={quantity <= 1}
        >
          <MinusCircle size={16} />
        </Button>
        
        <span className="w-7 text-center font-medium">{quantity}</span>
        
        <Button 
          type="button" 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7" 
          onClick={onIncrement} 
          disabled={quantity >= maxQuantity}
        >
          <PlusCircle size={16} />
        </Button>
      </div>
      
      <div className="w-20 text-right font-medium">
        {formatCurrency(product.sellPrice * quantity)}
      </div>
      
      <Button 
        type="button" 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
        onClick={onRemove}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
};

export default CartItem;
