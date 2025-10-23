
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, Service } from '@/models/types';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  item: Product | Service;
  type: 'product' | 'service';
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  globalDiscount: number;
  globalTip: number;
  globalCustomerName: string;
  addItem: (item: Product | Service, type: 'product' | 'service') => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateGlobalDiscount: (discount: number) => void;
  updateGlobalTip: (tip: number) => void;
  updateGlobalCustomerName: (customerName: string) => void;
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
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalTip, setGlobalTip] = useState<number>(0);
  const [globalCustomerName, setGlobalCustomerName] = useState<string>('');
  const { toast } = useToast();

  const addItem = (item: Product | Service, type: 'product' | 'service') => {
    if (isItemInCart(item.id)) return;
    
    const cartItem: CartItem = {
      item,
      type,
      quantity: 1
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
    
    const newItems = items.filter(item => item.item.id !== itemId);
    setItems(newItems);
    
    // Reset tip if no services remain
    const hasServices = newItems.some(item => item.type === 'service');
    if (!hasServices && globalTip > 0) {
      setGlobalTip(0);
    }
    
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
    
    const newItems = items.map(item => 
      item.item.id === itemId 
        ? { ...item, quantity: safeQuantity }
        : item
    );
    setItems(newItems);
    
    // Reset tip if no services remain
    const hasServices = newItems.some(item => item.type === 'service' && item.quantity > 0);
    if (!hasServices && globalTip > 0) {
      setGlobalTip(0);
    }
  };

  const updateGlobalDiscount = (discount: number) => {
    const subtotal = getSubtotal();
    const safeDiscount = Math.min(Math.max(0, discount), subtotal);
    setGlobalDiscount(safeDiscount);
  };

  const updateGlobalTip = (tip: number) => {
    const safeTip = Math.max(0, tip);
    setGlobalTip(safeTip);
  };

  const updateGlobalCustomerName = (customerName: string) => {
    setGlobalCustomerName(customerName);
  };

  const clearCart = () => {
    setItems([]);
    setGlobalDiscount(0);
    setGlobalTip(0);
    setGlobalCustomerName('');
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
    return globalDiscount;
  };

  const getTotalTip = () => {
    return globalTip;
  };

  const getFinalTotal = () => {
    return Math.max(0, getSubtotal() - getTotalDiscount() + getTotalTip());
  };

  return (
    <CartContext.Provider
      value={{
        items,
        globalDiscount,
        globalTip,
        globalCustomerName,
        addItem,
        removeItem,
        updateQuantity,
        updateGlobalDiscount,
        updateGlobalTip,
        updateGlobalCustomerName,
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
