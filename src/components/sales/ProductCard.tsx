
import React from 'react';
import { Product } from '@/models/types';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isInCart: boolean;
}

const ProductCard = ({ product, onAddToCart, isInCart }: ProductCardProps) => {
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;
  const isOutOfStock = product.stockQuantity === 0;
  
  const handleClick = () => {
    if (!isOutOfStock && !isInCart) {
      onAddToCart(product);
    }
  };
  
  return (
    <div 
      className={`border border-spa-sand rounded-md p-4 bg-white flex flex-col h-full relative transition-all duration-300 hover:shadow-md hover:bg-spa-sage/5 ${
        isInCart 
          ? 'border-green-200 bg-green-50' 
          : isOutOfStock 
            ? 'opacity-70' 
            : 'cursor-pointer hover:border-spa-sage'
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Add ${product.name} to cart${isInCart ? ' (already in cart)' : isOutOfStock ? ' (out of stock)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {isInCart && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[0.7rem] py-0 px-1.5">
            In Cart
          </Badge>
        )}
        {isLowStock && !isOutOfStock && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[0.7rem] py-0 px-1.5">
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[0.7rem] py-0 px-1.5">
            Out of Stock
          </Badge>
        )}
      </div>
      
      {/* Product name */}
      <h4 className="font-medium text-md text-spa-deep text-center mb-3 mt-1">{product.name}</h4>
      
      {/* Stock information */}
      <div className="text-sm text-right text-muted-foreground mb-auto">
        {product.stockQuantity} in stock
      </div>
      
      {/* Price */}
      <div className="font-medium text-md mt-4 pt-2 border-t border-spa-sand/50">
        {formatCurrency(product.sellPrice)}
      </div>
    </div>
  );
};

export default ProductCard;
