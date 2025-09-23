
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, Service } from '@/models/types';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  item: Product | Service;
  type: 'product' | 'service';
  quantity: number;
  discount: number;
  // Service-specific fields (only used when type is 'service')
  customerName?: string;
  tip?: number;
  notes?: string;
  serviceDate?: Date;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Product | Service, type: 'product' | 'service') => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDiscount: (itemId: string, discount: number) => void;
  updateServiceFields: (itemId: string, fields: { customerName?: string; tip?: number; notes?: string; serviceDate?: Date }) => void;
  clearCart: () => void;
  isItemInCart: (itemId: string) => boolean;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotalTip: () => number;
  getFinalTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addItem = (item: Product | Service, type: 'product' | 'service') => {
    if (isItemInCart(item.id)) return;
    
    const cartItem: CartItem = {
      item,
      type,
      quantity: 1,
      discount: 0,
      ...(type === 'service' && {
        customerName: '',
        tip: 0,
        notes: '',
        serviceDate: new Date()
      })
    };
    
    setItems([...items, cartItem]);
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const removeItem = (itemId: string) => {
    const cartItem = items.find(item => item.item.id === itemId);
    if (!cartItem) return;
    
    setItems(items.filter(item => item.item.id !== itemId));
    toast({
      title: "Removed from cart",
      description: `${cartItem.item.name} has been removed from your cart`,
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    const cartItem = items.find(item => item.item.id === itemId);
    if (!cartItem) return;
    
    // For products, respect stock limits; for services, no stock limitation
    let safeQuantity = quantity;
    if (cartItem.type === 'product') {
      const product = cartItem.item as Product;
      safeQuantity = Math.min(quantity, product.stockQuantity);
    }
    
    setItems(items.map(item => 
      item.item.id === itemId 
        ? { ...item, quantity: safeQuantity }
        : item
    ));
  };

  const updateDiscount = (itemId: string, discount: number) => {
    const cartItem = items.find(item => item.item.id === itemId);
    if (!cartItem) return;
    
    // Calculate item total based on type
    const itemPrice = cartItem.type === 'product' 
      ? (cartItem.item as Product).sellPrice 
      : (cartItem.item as Service).price;
    const itemTotal = itemPrice * cartItem.quantity;
    const safeDiscount = Math.min(discount, itemTotal);
    
    setItems(items.map(item => 
      item.item.id === itemId 
        ? { ...item, discount: safeDiscount }
        : item
    ));
  };

  const updateServiceFields = (itemId: string, fields: { customerName?: string; tip?: number; notes?: string; serviceDate?: Date }) => {
    const cartItem = items.find(item => item.item.id === itemId);
    if (!cartItem || cartItem.type !== 'service') return;
    
    setItems(items.map(item => 
      item.item.id === itemId 
        ? { ...item, ...fields }
        : item
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const isItemInCart = (itemId: string) => {
    return items.some(item => item.item.id === itemId);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemPrice = item.type === 'product' 
        ? (item.item as Product).sellPrice 
        : (item.item as Service).price;
      return sum + (itemPrice * item.quantity);
    }, 0);
  };

  const getTotalDiscount = () => {
    return items.reduce((sum, item) => sum + item.discount, 0);
  };

  const getTotalTip = () => {
    return items.reduce((sum, item) => {
      return sum + (item.type === 'service' ? (item.tip || 0) : 0);
    }, 0);
  };

  const getFinalTotal = () => {
    return Math.max(0, getSubtotal() - getTotalDiscount() + getTotalTip());
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateDiscount,
        updateServiceFields,
        clearCart,
        isItemInCart,
        getSubtotal,
        getTotalDiscount,
        getTotalTip,
        getFinalTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
