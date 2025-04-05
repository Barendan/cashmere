import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, Transaction } from "../models/types";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";

// Sample product data with the new skincare products
const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Facial Wash",
    description: "A gentle cleanser suitable for daily use, effectively removing makeup and impurities while leaving the skin pH balanced.",
    stockQuantity: 5,
    costPrice: 20.00,  // Assuming 50% of retail as cost price
    sellPrice: 40.00,
    category: "Cleanser",
    lowStockThreshold: 3,
    lastRestocked: new Date(),
    size: "7 oz",
    ingredients: "Aloe vera, lactic acid, citric acid",
    skinConcerns: "All skin types"
  },
  {
    id: "p2",
    name: "Smoothing Toner",
    description: "An alcohol-free toner with lactic and citric acids to help refine pores, remove excess debris and leave the skin refreshed.",
    stockQuantity: 5,
    costPrice: 20.00,
    sellPrice: 40.00,
    category: "Toner",
    lowStockThreshold: 3,
    lastRestocked: new Date(),
    size: "7 oz",
    ingredients: "Lactic acid, citric acid, aloe vera",
    skinConcerns: "Oily, breakout-prone skin"
  },
  {
    id: "p3",
    name: "Acne Cream",
    description: "A spot treatment cream with benzoyl peroxide that clears existing blemishes and prevents future breakouts.",
    stockQuantity: 5,
    costPrice: 19.00,
    sellPrice: 38.00,
    category: "Corrective",
    lowStockThreshold: 3,
    lastRestocked: new Date(),
    size: "0.5 oz",
    ingredients: "Benzoyl peroxide 5%",
    skinConcerns: "Acne, oily skin"
  },
  {
    id: "p4",
    name: "Intensive Age Refining Treatment: 0.5% Pure Retinol Night",
    description: "A powerful retinol night treatment with peptides and antioxidants for age control.",
    stockQuantity: 5,
    costPrice: 60.00,
    sellPrice: 120.00,
    category: "Corrective",
    lowStockThreshold: 3,
    lastRestocked: new Date(),
    size: "1 oz",
    ingredients: "Retinol, niacinamide, Hexylresorcinol",
    skinConcerns: "Fine lines, uneven tone"
  },
  {
    id: "p5",
    name: "Weightless Protection Broad Spectrum SPF 45",
    description: "A lightweight sunscreen that provides broad-spectrum protection with a matte finish.",
    stockQuantity: 5,
    costPrice: 22.00,
    sellPrice: 44.00,
    category: "Moisturizer",
    lowStockThreshold: 3,
    lastRestocked: new Date(),
    size: "1.7 oz",
    ingredients: "Zinc oxide, octinoxate",
    skinConcerns: "Sun protection"
  }
];

// Sample transaction data
const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    productId: "p1",
    productName: "Hydrating Facial Serum",
    quantity: 2,
    price: 34.99 * 2,
    type: "sale",
    date: new Date("2023-03-20T14:30:00"),
    userId: "2",
    userName: "Employee"
  },
  {
    id: "t2",
    productId: "p2",
    productName: "Exfoliating Scrub",
    quantity: 1,
    price: 24.99,
    type: "sale",
    date: new Date("2023-03-20T15:45:00"),
    userId: "2",
    userName: "Employee"
  },
  {
    id: "t3",
    productId: "p3",
    productName: "Calming Rose Toner",
    quantity: 5,
    price: 18.99 * 5,
    type: "restock",
    date: new Date("2023-03-12T10:00:00"),
    userId: "1",
    userName: "Admin User"
  }
];

interface DataContextType {
  products: Product[];
  transactions: Transaction[];
  lastRestockDate: Date | null;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  recordSale: (productId: string, quantity: number) => void;
  recordRestock: (productId: string, quantity: number) => void;
  adjustInventory: (productId: string, newQuantity: number) => void;
  updateLastRestockDate: () => void;
  undoLastTransaction: () => void;
  getProduct: (id: string) => Product | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastRestockDate, setLastRestockDate] = useState<Date | null>(null);
  const [lastAction, setLastAction] = useState<{ action: string; data: any } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Load data from localStorage or use sample data
    const savedProducts = localStorage.getItem("spaProducts");
    const savedTransactions = localStorage.getItem("spaTransactions");
    const savedRestockDate = localStorage.getItem("lastRestockDate");
    
    setProducts(savedProducts ? JSON.parse(savedProducts) : SAMPLE_PRODUCTS);
    setTransactions(savedTransactions ? JSON.parse(savedTransactions) : SAMPLE_TRANSACTIONS);
    setLastRestockDate(savedRestockDate ? new Date(JSON.parse(savedRestockDate)) : null);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem("spaProducts", JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem("spaTransactions", JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (lastRestockDate) {
      localStorage.setItem("lastRestockDate", JSON.stringify(lastRestockDate));
    }
  }, [lastRestockDate]);

  const saveLastAction = (action: string, data: any) => {
    setLastAction({ action, data });
  };

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct = { ...product, id: uuidv4() };
    setProducts([...products, newProduct]);
    toast({ title: "Product Added", description: `${product.name} was added to inventory.` });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const oldProduct = products.find(p => p.id === id);
    if (!oldProduct) return;
    
    // Save the old state for potential undo
    saveLastAction("updateProduct", { id, oldData: { ...oldProduct } });
    
    setProducts(products.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
    
    toast({ title: "Product Updated", description: `${oldProduct.name} was updated.` });
  };

  const deleteProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    // Save the old state for potential undo
    saveLastAction("deleteProduct", { product });
    
    setProducts(products.filter(p => p.id !== id));
    toast({ title: "Product Deleted", description: `${product.name} was removed from inventory.` });
  };

  const recordSale = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    if (product.stockQuantity < quantity) {
      toast({ title: "Error", description: "Not enough items in stock.", variant: "destructive" });
      return;
    }

    // Save the old state for potential undo
    saveLastAction("recordSale", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    // Update product quantity
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { ...p, stockQuantity: p.stockQuantity - quantity }
        : p
    );
    setProducts(updatedProducts);

    // Add transaction record
    const newTransaction: Transaction = {
      id: uuidv4(),
      productId,
      productName: product.name,
      quantity,
      price: product.sellPrice * quantity,
      type: "sale",
      date: new Date(),
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    setTransactions([newTransaction, ...transactions]);
    toast({ title: "Sale Recorded", description: `Sold ${quantity} ${product.name}.` });
  };

  const recordRestock = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    // Save the old state for potential undo
    saveLastAction("recordRestock", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    // Update product quantity and last restocked date
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { 
            ...p, 
            stockQuantity: p.stockQuantity + quantity,
            lastRestocked: new Date()
          }
        : p
    );
    setProducts(updatedProducts);

    // Add transaction record
    const newTransaction: Transaction = {
      id: uuidv4(),
      productId,
      productName: product.name,
      quantity,
      price: product.costPrice * quantity,
      type: "restock",
      date: new Date(),
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    setTransactions([newTransaction, ...transactions]);
    toast({ title: "Restock Recorded", description: `Added ${quantity} ${product.name} to inventory.` });
  };

  const adjustInventory = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    // Save the old state for potential undo
    saveLastAction("adjustInventory", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    const difference = newQuantity - product.stockQuantity;
    
    // Update product quantity
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { ...p, stockQuantity: newQuantity }
        : p
    );
    setProducts(updatedProducts);

    // Add transaction record
    const newTransaction: Transaction = {
      id: uuidv4(),
      productId,
      productName: product.name,
      quantity: Math.abs(difference),
      price: 0, // No price impact for adjustment
      type: "adjustment",
      date: new Date(),
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    setTransactions([newTransaction, ...transactions]);
    toast({ 
      title: "Inventory Adjusted", 
      description: `${product.name} quantity updated to ${newQuantity}.` 
    });
  };

  const updateLastRestockDate = () => {
    // Save current date for undo
    saveLastAction("updateLastRestockDate", { 
      oldDate: lastRestockDate
    });
    
    const newDate = new Date();
    setLastRestockDate(newDate);
    toast({ 
      title: "Restock Date Updated", 
      description: `Last restock date set to ${newDate.toLocaleDateString()}.` 
    });
  };

  const undoLastTransaction = () => {
    if (!lastAction) {
      toast({ title: "No Action to Undo", description: "There is no recent action to undo." });
      return;
    }

    const { action, data } = lastAction;

    switch (action) {
      case "recordSale":
        // Restore product quantity
        setProducts(products.map(p =>
          p.id === data.productId
            ? { ...p, stockQuantity: data.oldQuantity }
            : p
        ));
        // Remove the last transaction
        setTransactions(transactions.slice(1));
        break;
        
      case "recordRestock":
        // Restore product quantity
        setProducts(products.map(p =>
          p.id === data.productId
            ? { ...p, stockQuantity: data.oldQuantity }
            : p
        ));
        // Remove the last transaction
        setTransactions(transactions.slice(1));
        break;
        
      case "adjustInventory":
        // Restore product quantity
        setProducts(products.map(p =>
          p.id === data.productId
            ? { ...p, stockQuantity: data.oldQuantity }
            : p
        ));
        // Remove the last transaction
        setTransactions(transactions.slice(1));
        break;
        
      case "updateLastRestockDate":
        // Restore the previous date
        setLastRestockDate(data.oldDate);
        break;
        
      case "updateProduct":
        // Restore the previous product state
        setProducts(products.map(p =>
          p.id === data.id
            ? { ...data.oldData }
            : p
        ));
        break;
        
      case "deleteProduct":
        // Restore the deleted product
        setProducts([...products, data.product]);
        break;
        
      default:
        toast({ 
          title: "Cannot Undo", 
          description: "This action cannot be undone.", 
          variant: "destructive" 
        });
        return;
    }

    toast({ title: "Action Undone", description: "The last action has been reversed." });
    setLastAction(null); // Clear the last action after undoing
  };

  const getProduct = (id: string) => {
    return products.find(p => p.id === id);
  };

  return (
    <DataContext.Provider
      value={{
        products,
        transactions,
        lastRestockDate,
        addProduct,
        updateProduct,
        deleteProduct,
        recordSale,
        recordRestock,
        adjustInventory,
        updateLastRestockDate,
        undoLastTransaction,
        getProduct
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
