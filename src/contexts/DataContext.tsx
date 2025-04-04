
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, Transaction } from "../models/types";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";
import { 
  fetchProducts, 
  fetchTransactions, 
  addProductToDb, 
  updateProductInDb, 
  deleteProductFromDb,
  addTransactionToDb,
  seedProducts
} from "../services/supabaseClient";
import { productSeedData } from "../services/seedData";

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
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastRestockDate, setLastRestockDate] = useState<Date | null>(null);
  const [lastAction, setLastAction] = useState<{ action: string; data: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products from Supabase
        const productsData = await fetchProducts();
        
        // If no products, seed the database with our data
        if (productsData.length === 0) {
          await seedProducts(productSeedData);
          const newProductsData = await fetchProducts();
          setProducts(newProductsData);
        } else {
          setProducts(productsData);
        }
        
        // Fetch transactions
        const transactionsData = await fetchTransactions();
        if (transactionsData.length === 0) {
          // Use sample transactions if none exist
          setTransactions(SAMPLE_TRANSACTIONS);
        } else {
          setTransactions(transactionsData);
        }
        
        // Get latest restock date
        const lastRestockTx = transactionsData
          .filter(t => t.type === 'restock')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
        setLastRestockDate(lastRestockTx ? new Date(lastRestockTx.date) : null);
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try again later.");
        setIsLoading(false);
        
        // Fallback to localStorage if API fails
        const savedProducts = localStorage.getItem("spaProducts");
        const savedTransactions = localStorage.getItem("spaTransactions");
        const savedRestockDate = localStorage.getItem("lastRestockDate");
        
        if (savedProducts) setProducts(JSON.parse(savedProducts));
        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
        if (savedRestockDate) setLastRestockDate(new Date(JSON.parse(savedRestockDate)));
        
        toast({ 
          title: "Connection Error", 
          description: "Using local data. Changes won't be saved to the database.",
          variant: "destructive" 
        });
      }
    };
    
    loadData();
  }, [toast]);

  // Save data to localStorage as backup
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

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      const newProduct = await addProductToDb(product);
      setProducts([...products, newProduct]);
      toast({ title: "Product Added", description: `${product.name} was added to inventory.` });
    } catch (err) {
      console.error("Error adding product:", err);
      toast({ 
        title: "Error", 
        description: "Failed to add product. Please try again.", 
        variant: "destructive" 
      });
      
      // Fallback to local addition if API fails
      const localNewProduct = { ...product, id: uuidv4() };
      setProducts([...products, localNewProduct]);
      toast({ 
        title: "Product Added Locally", 
        description: "Note: This change is only saved locally.", 
        variant: "default" 
      });
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const oldProduct = products.find(p => p.id === id);
    if (!oldProduct) return;
    
    // Save the old state for potential undo
    saveLastAction("updateProduct", { id, oldData: { ...oldProduct } });
    
    try {
      await updateProductInDb(id, updates);
      setProducts(products.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
      toast({ title: "Product Updated", description: `${oldProduct.name} was updated.` });
    } catch (err) {
      console.error("Error updating product:", err);
      toast({ 
        title: "Error", 
        description: "Failed to update product. Changes saved locally only.", 
        variant: "destructive" 
      });
      
      // Update locally anyway
      setProducts(products.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
    }
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    // Save the old state for potential undo
    saveLastAction("deleteProduct", { product });
    
    try {
      await deleteProductFromDb(id);
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Product Deleted", description: `${product.name} was removed from inventory.` });
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({ 
        title: "Error", 
        description: "Failed to delete product from database. Removed locally only.", 
        variant: "destructive" 
      });
      
      // Remove locally anyway
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const recordSale = async (productId: string, quantity: number) => {
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

    // Add transaction record
    const newTransaction: Omit<Transaction, "id"> = {
      productId,
      productName: product.name,
      quantity,
      price: product.sellPrice * quantity,
      type: "sale",
      date: new Date(),
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    try {
      // Update product in database
      await updateProductInDb(productId, { stockQuantity: product.stockQuantity - quantity });
      
      // Add transaction to database
      const savedTransaction = await addTransactionToDb(newTransaction);
      
      // Update local state
      setProducts(updatedProducts);
      setTransactions([savedTransaction, ...transactions]);
      
      toast({ title: "Sale Recorded", description: `Sold ${quantity} ${product.name}.` });
    } catch (err) {
      console.error("Error recording sale:", err);
      toast({ 
        title: "Connection Error", 
        description: "Sale recorded locally only. Database not updated.", 
        variant: "destructive" 
      });
      
      // Update local state anyway
      setProducts(updatedProducts);
      setTransactions([{ ...newTransaction, id: uuidv4() }, ...transactions]);
    }
  };

  const recordRestock = async (productId: string, quantity: number) => {
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
    const newStockQuantity = product.stockQuantity + quantity;
    const newLastRestocked = new Date();
    
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { 
            ...p, 
            stockQuantity: newStockQuantity,
            lastRestocked: newLastRestocked
          }
        : p
    );

    // Add transaction record
    const newTransaction: Omit<Transaction, "id"> = {
      productId,
      productName: product.name,
      quantity,
      price: product.costPrice * quantity,
      type: "restock",
      date: newLastRestocked,
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    try {
      // Update product in database
      await updateProductInDb(productId, { 
        stockQuantity: newStockQuantity,
        lastRestocked: newLastRestocked
      });
      
      // Add transaction to database
      const savedTransaction = await addTransactionToDb(newTransaction);
      
      // Update local state
      setProducts(updatedProducts);
      setTransactions([savedTransaction, ...transactions]);
      setLastRestockDate(newLastRestocked);
      
      toast({ title: "Restock Recorded", description: `Added ${quantity} ${product.name} to inventory.` });
    } catch (err) {
      console.error("Error recording restock:", err);
      toast({ 
        title: "Connection Error", 
        description: "Restock recorded locally only. Database not updated.", 
        variant: "destructive" 
      });
      
      // Update local state anyway
      setProducts(updatedProducts);
      setTransactions([{ ...newTransaction, id: uuidv4() }, ...transactions]);
      setLastRestockDate(newLastRestocked);
    }
  };

  const adjustInventory = async (productId: string, newQuantity: number) => {
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

    // Add transaction record
    const newTransaction: Omit<Transaction, "id"> = {
      productId,
      productName: product.name,
      quantity: Math.abs(difference),
      price: 0, // No price impact for adjustment
      type: "adjustment",
      date: new Date(),
      userId: user?.id || "unknown",
      userName: user?.name || "Unknown User"
    };
    
    try {
      // Update product in database
      await updateProductInDb(productId, { stockQuantity: newQuantity });
      
      // Add transaction to database
      const savedTransaction = await addTransactionToDb(newTransaction);
      
      // Update local state
      setProducts(updatedProducts);
      setTransactions([savedTransaction, ...transactions]);
      
      toast({ 
        title: "Inventory Adjusted", 
        description: `${product.name} quantity updated to ${newQuantity}.` 
      });
    } catch (err) {
      console.error("Error adjusting inventory:", err);
      toast({ 
        title: "Connection Error", 
        description: "Adjustment recorded locally only. Database not updated.", 
        variant: "destructive" 
      });
      
      // Update local state anyway
      setProducts(updatedProducts);
      setTransactions([{ ...newTransaction, id: uuidv4() }, ...transactions]);
    }
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
        getProduct,
        isLoading,
        error
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
