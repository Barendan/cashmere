
import React from 'react';
import { Product } from '@/models/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart, AlertCircle } from 'lucide-react';
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
    <div className="border border-spa-sand rounded-md p-2 bg-spa-cream/20 h-full flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-xs text-spa-deep truncate mr-1">{product.name}</h4>
        {isLowStock && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[0.65rem] py-0 px-1 shrink-0">
            Low Stock
          </Badge>
        )}
      </div>
      
      <div className="text-xs mb-1.5 text-muted-foreground">
        {product.stockQuantity} in stock
      </div>
      
      <div className="flex justify-between items-center mt-auto">
        <div className="font-medium text-xs">{formatCurrency(product.sellPrice)}</div>
        <Button 
          size="sm"
          variant={isInCart ? "outline" : "default"}
          className={`${isInCart ? "bg-green-50 text-green-700 border-green-200" : ""} text-[0.65rem] py-0.5 px-1.5 h-auto`}
          onClick={() => onAddToCart(product)}
          disabled={product.stockQuantity === 0 || isInCart}
        >
          <ShoppingCart size={12} className="mr-1" />
          {isInCart ? "In Cart" : "Add"}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
