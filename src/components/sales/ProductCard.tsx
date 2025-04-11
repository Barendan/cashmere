
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
  
  // Base receipt-style card class for the first three designs
  let cardClassName = `relative font-mono bg-white border border-spa-sand rounded-md p-4 flex flex-col h-full
    transition-all duration-300 shadow-md before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 
    before:h-1 before:bg-[repeating-linear-gradient(90deg,var(--spa-sand),var(--spa-sand)_5px,transparent_5px,transparent_12px)]
    ${isInCart 
      ? 'bg-white border-green-200' 
      : isOutOfStock 
        ? 'opacity-80' 
        : 'cursor-pointer hover:border-spa-sage hover:-translate-y-2 hover:shadow-lg hover:bg-spa-cream transition-transform'
    }`;
  
  // Apply card style based on the prop (for the first three cards only)
  if (cardStyle === "design-1") {
    // First receipt-style design with different dotted pattern
    cardClassName = `relative font-mono bg-white border border-spa-sand rounded-md p-4 flex flex-col h-full
      transition-all duration-300 shadow-md before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 
      before:h-1 before:bg-[repeating-linear-gradient(90deg,var(--spa-sand),var(--spa-sand)_8px,transparent_8px,transparent_16px)]
      ${isInCart 
        ? 'bg-white border-green-200' 
        : isOutOfStock 
          ? 'opacity-80' 
          : 'cursor-pointer hover:border-spa-sage hover:-translate-y-2 hover:shadow-lg hover:bg-spa-cream transition-transform'
      }`;
  } else if (cardStyle === "design-2") {
    // Second receipt-style design with dotted separator
    cardClassName = `relative font-mono bg-white border border-spa-sand rounded-md p-4 flex flex-col h-full
      transition-all duration-300 shadow-md before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 
      before:h-1 before:bg-[repeating-linear-gradient(45deg,var(--spa-sand),var(--spa-sand)_3px,transparent_3px,transparent_10px)]
      ${isInCart 
        ? 'bg-white border-green-200' 
        : isOutOfStock 
          ? 'opacity-80' 
          : 'cursor-pointer hover:border-spa-sage hover:-translate-y-2 hover:shadow-lg hover:bg-spa-cream transition-transform'
      }`;
  } else if (cardStyle === "design-3") {
    // Third receipt-style design with dashed separator
    cardClassName = `relative font-mono bg-white border border-spa-sand rounded-md p-4 flex flex-col h-full
      transition-all duration-300 shadow-md before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 
      before:h-1 before:bg-[repeating-linear-gradient(to_right,var(--spa-sand)_0px,var(--spa-sand)_4px,transparent_4px,transparent_12px)]
      ${isInCart 
        ? 'bg-white border-green-200' 
        : isOutOfStock 
          ? 'opacity-80' 
          : 'cursor-pointer hover:border-spa-sage hover:-translate-y-2 hover:shadow-lg hover:bg-spa-cream transition-transform'
      }`;
  }
  
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
      <h4 className="font-mono text-md text-spa-deep text-center mb-2 uppercase tracking-wider pb-2 border-b border-dotted border-spa-sand">
        {product.name}
      </h4>
      
      {/* Stock information with receipt styling */}
      <div className="text-sm text-right text-muted-foreground mb-auto font-mono tracking-wide">
        QTY: {product.stockQuantity}
      </div>
      
      {/* Price with receipt-style footer */}
      <div className="font-mono text-md mt-4 pt-2 border-t border-dotted border-spa-sand flex justify-between items-center">
        <span className="text-xs uppercase text-muted-foreground">Price</span>
        <span className="text-lg">{formatCurrency(product.sellPrice)}</span>
      </div>
      
      {/* Conditional elements for product status */}
      {isInCart && (
        <div className="absolute bottom-3 right-3 bg-green-600 text-white h-8 w-8 rounded-full flex items-center justify-center opacity-80 transform rotate-12 shadow-md">
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
