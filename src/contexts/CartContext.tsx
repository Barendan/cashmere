
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '@/models/types';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  isProductInCart: (productId: string) => boolean;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getFinalTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addItem = (product: Product) => {
    if (isProductInCart(product.id)) return;
    
    setItems([...items, { product, quantity: 1, discount: 0 }]);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const removeItem = (productId: string) => {
    const product = items.find(item => item.product.id === productId)?.product;
    if (!product) return;
    
    setItems(items.filter(item => item.product.id !== productId));
    toast({
      title: "Removed from cart",
      description: `${product.name} has been removed from your cart`,
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = items.find(item => item.product.id === productId);
    if (!item) return;
    
    const safeQuantity = Math.min(quantity, item.product.stockQuantity);
    
    setItems(items.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: safeQuantity }
        : item
    ));
  };

  const updateDiscount = (productId: string, discount: number) => {
    const item = items.find(item => item.product.id === productId);
    if (!item) return;
    
    const itemTotal = item.product.sellPrice * item.quantity;
    const safeDiscount = Math.min(discount, itemTotal);
    
    setItems(items.map(item => 
      item.product.id === productId 
        ? { ...item, discount: safeDiscount }
        : item
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const isProductInCart = (productId: string) => {
    return items.some(item => item.product.id === productId);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  };

  const getTotalDiscount = () => {
    return items.reduce((sum, item) => sum + item.discount, 0);
  };

  const getFinalTotal = () => {
    return Math.max(0, getSubtotal() - getTotalDiscount());
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateDiscount,
        clearCart,
        isProductInCart,
        getSubtotal,
        getTotalDiscount,
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
