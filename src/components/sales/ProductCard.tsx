
import React from 'react';
import { Product } from '@/models/types';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle, Percent } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (product: Product) => void;
  isInCart: boolean;
  cardStyle?: string;
  discount?: number;
}

const ProductCard = ({ 
  product, 
  onAddToCart, 
  onRemoveFromCart, 
  isInCart, 
  cardStyle = "",
  discount = 0
}: ProductCardProps) => {
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;
  const isOutOfStock = product.stockQuantity === 0;
  
  const handleClick = () => {
    if (isOutOfStock) return;
    
    if (isInCart) {
      onRemoveFromCart && onRemoveFromCart(product);
    } else {
      onAddToCart(product);
    }
  };
  
  // Updated card class with distinct styling for cart items
  let cardClassName = `relative font-mono border rounded-md p-4 flex flex-col h-full
    transition-all duration-300 shadow-md
    ${isInCart 
      ? 'bg-emerald-50 border-emerald-300 shadow-lg' 
      : isOutOfStock 
        ? 'bg-white border-spa-sand opacity-80' 
        : 'bg-white border-spa-sand cursor-pointer hover:border-spa-sage hover:shadow-lg hover:bg-spa-cream'
    }`;
  
  return (
    <div 
      className={cardClassName}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${isInCart ? 'Remove' : 'Add'} ${product.name} ${isInCart ? 'from' : 'to'} cart${isOutOfStock ? ' (out of stock)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        {isInCart && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[0.7rem] py-0 px-1.5 font-mono">
            In Cart
          </Badge>
        )}
        {isLowStock && !isOutOfStock && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[0.7rem] py-0 px-1.5 font-mono">
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[0.7rem] py-0 px-1.5 font-mono">
            Out of Stock
          </Badge>
        )}
      </div>
      
      {/* Product name - with receipt-style header */}
      <h4 className="font-mono text-md text-center mb-2 tracking-wider">
        {product.name}
      </h4>
      
      {/* Stock information with receipt styling */}
      <div className="text-sm text-muted-foreground mb-2 font-mono tracking-wide">
        QTY: {product.stockQuantity}
      </div>
      
      {/* Category and price with receipt-style footer */}
      <div className="mt-auto pt-2 flex justify-between items-center">
        <span className="text-xs uppercase text-blue-600">{product.category}</span>
        {discount > 0 && isInCart ? (
          <div className="flex flex-col items-end">
            <span className="text-sm line-through text-muted-foreground">{formatCurrency(product.sellPrice)}</span>
            <div className="flex items-center">
              <Percent className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-lg font-semibold text-red-500">
                {formatCurrency(Math.max(0, product.sellPrice - discount))}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-lg font-semibold">{formatCurrency(product.sellPrice)}</span>
        )}
      </div>
      
      {/* Add checkmark icon for cart items */}
      {isInCart && (
        <div className="absolute bottom-2 left-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>
      )}
      
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-700 text-white py-1 px-4 transform -rotate-12 font-mono text-lg uppercase tracking-wider shadow-md opacity-90">
            Sold Out
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
