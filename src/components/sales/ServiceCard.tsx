import React from 'react';
import { Service } from '@/models/types';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  onAddToCart: (service: Service) => void;
  onRemoveFromCart?: (service: Service) => void;
  isInCart: boolean;
}

const ServiceCard = ({ 
  service, 
  onAddToCart, 
  onRemoveFromCart, 
  isInCart
}: ServiceCardProps) => {
  const isInactive = service.active === false;
  
  const handleClick = () => {
    if (isInactive) return;
    
    if (isInCart) {
      onRemoveFromCart && onRemoveFromCart(service);
    } else {
      onAddToCart(service);
    }
  };
  
  // Updated card class with distinct styling for cart items
  let cardClassName = `relative font-mono border rounded-md p-4 flex flex-col h-full
    transition-all duration-300 shadow-md
    ${isInCart 
      ? 'bg-emerald-50 border-emerald-300 shadow-lg' 
      : isInactive 
        ? 'bg-white border-spa-sand opacity-80' 
        : 'bg-white border-spa-sand cursor-pointer hover:border-spa-sage hover:shadow-lg hover:bg-spa-cream'
    }`;
  
  return (
    <div 
      className={cardClassName}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${isInCart ? 'Remove' : 'Add'} ${service.name} ${isInCart ? 'from' : 'to'} cart${isInactive ? ' (inactive)' : ''}`}
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
        {isInactive && (
          <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200 text-[0.7rem] py-0 px-1.5 font-mono">
            Inactive
          </Badge>
        )}
      </div>
      
      {/* Service name - with receipt-style header */}
      <h4 className="font-mono text-md text-center mb-2 tracking-wider">
        {service.name}
      </h4>
      
      {/* Service description */}
      {service.description && (
        <div className="text-sm text-muted-foreground mb-2 font-mono tracking-wide text-center">
          {service.description}
        </div>
      )}
      
      {/* Service icon and price with receipt-style footer */}
      <div className="mt-auto pt-2 flex justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-spa-sage mr-1" />
          <span className="text-xs uppercase text-spa-sage">Service</span>
        </div>
        <span className="text-lg font-semibold">{formatCurrency(service.price)}</span>
      </div>
      
      {/* Add checkmark icon for cart items */}
      {isInCart && (
        <div className="absolute bottom-2 left-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>
      )}
      
      {isInactive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gray-700 text-white py-1 px-4 transform -rotate-12 font-mono text-lg uppercase tracking-wider shadow-md opacity-90">
            Inactive
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;