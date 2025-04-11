
import React from 'react';
import { Product } from '@/models/types';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Check, XCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isInCart: boolean;
  cardStyle?: string;
}

const ProductCard = ({ product, onAddToCart, isInCart, cardStyle = "" }: ProductCardProps) => {
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;
  const isOutOfStock = product.stockQuantity === 0;
  
  const handleClick = () => {
    if (!isOutOfStock && !isInCart) {
      onAddToCart(product);
    }
  };
  
  // Base receipt-style card class - removed the -translate-y-2 transformation from hover
  let cardClassName = `relative font-mono bg-white border border-spa-sand rounded-md p-4 flex flex-col h-full
    transition-all duration-300 shadow-md
    ${isInCart 
      ? 'bg-white border-green-200' 
      : isOutOfStock 
        ? 'opacity-80' 
        : 'cursor-pointer hover:border-spa-sage hover:shadow-lg hover:bg-spa-cream transition-transform'
    }`;
  
  return (
    <div 
      className={cardClassName}
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
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        {isInCart && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[0.7rem] py-0 px-1.5 font-mono">
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
        <span className="text-lg font-semibold">{formatCurrency(product.sellPrice)}</span>
      </div>
      
      {/* Conditional elements for product status */}
      {isInCart && (
        <div className="absolute bottom-3 right-3 bg-green-600 text-white h-8 w-8 rounded-full flex items-center justify-center opacity-80 shadow-md">
          <Check className="h-5 w-5" />
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
