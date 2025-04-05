
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
    <div className="border border-spa-sand rounded-md p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{product.name}</h4>
        {isLowStock && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
            Low Stock
          </Badge>
        )}
      </div>
      
      <div className="text-sm mb-2">
        {product.stockQuantity} in stock
      </div>
      
      <div className="flex justify-between items-center">
        <div className="font-medium">{formatCurrency(product.sellPrice)}</div>
        <Button 
          size="sm"
          variant={isInCart ? "outline" : "default"}
          className={isInCart ? "bg-green-50 text-green-700 border-green-200" : ""}
          onClick={() => onAddToCart(product)}
          disabled={product.stockQuantity === 0 || isInCart}
        >
          <ShoppingCart size={16} className="mr-1" />
          {isInCart ? "In Cart" : "Add"}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
