
import React from 'react';
import { Product } from '@/models/types';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

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
  
  // Apply card style based on the prop
  let cardClassName = `border border-spa-sand rounded-md p-4 bg-white flex flex-col h-full relative transition-all duration-300 hover:shadow-md hover:bg-spa-sage/5 ${
    isInCart 
      ? 'border-green-200 bg-green-50' 
      : isOutOfStock 
        ? 'opacity-70' 
        : 'cursor-pointer hover:border-spa-sage'
  }`;
  
  // Add design-specific styling
  if (cardStyle === "design-1") {
    // Bold, modern design with strong colors and sharp edges
    cardClassName = `border-0 rounded-lg p-4 bg-gradient-to-br from-[#9b87f5] to-[#8B5CF6] text-white flex flex-col h-full relative transition-all duration-300 shadow-md hover:shadow-xl ${
      isInCart 
        ? 'ring-2 ring-white ring-opacity-50' 
        : isOutOfStock 
          ? 'opacity-70' 
          : 'cursor-pointer'
    }`;
  } else if (cardStyle === "design-2") {
    // Elegant, minimalist design with subtle gradients
    cardClassName = `border border-[#E5E7EB] rounded-xl p-5 bg-gradient-to-b from-[#F9FAFB] to-[#F3F4F6] flex flex-col h-full relative transition-all duration-300 hover:shadow-md ${
      isInCart 
        ? 'border-green-200 bg-gradient-to-b from-[#ECFDF5] to-[#D1FAE5]' 
        : isOutOfStock 
          ? 'opacity-70' 
          : 'cursor-pointer hover:border-[#D1D5DB]'
    }`;
  } else if (cardStyle === "design-3") {
    // Fun, playful design with rounded corners and bright colors
    cardClassName = `border-2 border-[#F97316] rounded-3xl p-4 bg-gradient-to-r from-[#FEF7CD] to-[#FFDEE2] flex flex-col h-full relative transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
      isInCart 
        ? 'border-green-400 bg-gradient-to-r from-[#F2FCE2] to-[#ECFCCB]' 
        : isOutOfStock 
          ? 'opacity-70 border-gray-300' 
          : 'cursor-pointer'
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
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {isInCart && (
          <Badge variant="outline" className={`${cardStyle === "design-1" ? 'bg-white/20 text-white border-white/30' : cardStyle === "design-3" ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'} text-[0.7rem] py-0 px-1.5`}>
            In Cart
          </Badge>
        )}
        {isLowStock && !isOutOfStock && (
          <Badge variant="outline" className={`${cardStyle === "design-1" ? 'bg-white/20 text-white border-white/30' : cardStyle === "design-3" ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 text-amber-800 border-amber-200'} text-[0.7rem] py-0 px-1.5`}>
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="outline" className={`${cardStyle === "design-1" ? 'bg-white/20 text-white border-white/30' : cardStyle === "design-3" ? 'bg-red-100 text-red-700 border-red-200' : 'bg-red-50 text-red-800 border-red-200'} text-[0.7rem] py-0 px-1.5`}>
            Out of Stock
          </Badge>
        )}
      </div>
      
      {/* Product name */}
      <h4 className={`font-medium text-md ${cardStyle === "design-1" ? 'text-white' : cardStyle === "design-2" ? 'text-gray-800 font-semibold text-lg' : cardStyle === "design-3" ? 'text-orange-800 font-bold text-center' : 'text-spa-deep'} text-center mb-3 mt-1`}>
        {product.name}
      </h4>
      
      {/* Stock information */}
      <div className={`text-sm text-right ${cardStyle === "design-1" ? 'text-white/70' : cardStyle === "design-3" ? 'text-orange-600 font-medium' : 'text-muted-foreground'} mb-auto`}>
        {product.stockQuantity} in stock
      </div>
      
      {/* Price */}
      <div className={`font-medium ${cardStyle === "design-1" ? 'text-white text-xl mt-4 pt-2 border-t border-white/20' : cardStyle === "design-2" ? 'text-lg text-gray-900 mt-4 pt-3 border-t border-gray-200' : cardStyle === "design-3" ? 'text-orange-900 text-xl font-bold mt-4 pt-2 border-t-2 border-orange-200 text-center' : 'text-md mt-4 pt-2 border-t border-spa-sand/50'}`}>
        {formatCurrency(product.sellPrice)}
      </div>
    </div>
  );
};

export default ProductCard;
