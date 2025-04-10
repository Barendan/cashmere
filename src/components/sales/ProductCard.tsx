
import React from 'react';
import { Product } from '@/models/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isInCart: boolean;
}

const ProductCard = ({ product, onAddToCart, isInCart }: ProductCardProps) => {
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;
  
  return (
    <div className="border border-spa-sand rounded-md p-3 bg-spa-cream/20 h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm text-spa-deep truncate mr-1">{product.name}</h4>
        {isLowStock && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[0.7rem] py-0 px-1.5 shrink-0">
            Low Stock
          </Badge>
        )}
      </div>
      
      <div className="text-sm mb-2 text-muted-foreground">
        {product.stockQuantity} in stock
      </div>
      
      <div className="flex justify-between items-center mt-auto">
        <div className="font-medium text-sm">{formatCurrency(product.sellPrice)}</div>
        <Button 
          size="icon"
          variant={isInCart ? "outline" : "default"}
          className={`${
            isInCart 
              ? "bg-green-50 border-green-200 text-green-700 h-8 w-8" 
              : "bg-spa-sage text-spa-deep h-8 w-8"
          }`}
          onClick={() => onAddToCart(product)}
          disabled={product.stockQuantity === 0 || isInCart}
        >
          {isInCart ? <Check size={16} /> : <Plus size={16} />}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
