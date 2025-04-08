import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, Transaction, Sale } from "../models/types";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "./AuthContext";
import { 
  fetchProducts, 
  addProductToDb, 
  updateProductInDb, 
  deleteProductFromDb 
} from "../services/productService";
import {
  fetchTransactions,
  fetchSales,
  recordSaleInDb,
  recordTransactionInDb,
  recordBulkTransactionsInDb,
  updateProductStock,
  updateProductRestockDate,
  getLastRestockDate
} from "../services/transactionService";
import { supabase, mapSaleRowToSale, mapTransactionRowToTransaction } from "../integrations/supabase/client";

interface DataContextType {
  products: Product[];
  transactions: Transaction[];
  sales: Sale[];
  lastRestockDate: Date | null;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  recordSale: (productId: string, quantity: number) => void;
  recordBulkSale: (items: {product: Product, quantity: number}[]) => Promise<void>;
  recordRestock: (productId: string, quantity: number) => void;
  adjustInventory: (productId: string, newQuantity: number) => void;
  updateLastRestockDate: () => void;
  undoLastTransaction: () => void;
  getProduct: (id: string) => Product | undefined;
  isLoading: boolean;
  getTotalInventoryValue: () => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lastRestockDate, setLastRestockDate] = useState<Date | null>(null);
  const [lastAction, setLastAction] = useState<{ action: string; data: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      try {
        const transformedProducts = await fetchProducts();
        setProducts(transformedProducts);
        
        try {
          const transformedSales = await fetchSales();
          
          const transformedTransactions = await fetchTransactions();
          
          const salesWithItems: Sale[] = transformedSales.map(sale => {
            const saleItems = transformedTransactions.filter(transaction => transaction.saleId === sale.id);
            return { ...sale, items: saleItems };
          });
          
          setSales(salesWithItems);
          setTransactions(transformedTransactions);
        } catch (error) {
          console.error('Error fetching sales:', error);
          setSales([]);
        }

        const restockDate = await getLastRestockDate();
        if (restockDate) {
          setLastRestockDate(restockDate);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast({ 
          title: "Error Loading Data", 
          description: "Failed to load data from database.", 
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const saveLastAction = (action: string, data: any) => {
    setLastAction({ action, data });
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      const newProduct = await addProductToDb(product);
      
      setProducts([...products, newProduct]);
      toast({ title: "Product Added", description: `${product.name} was added to inventory.` });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add product.", 
        variant: "destructive" 
      });
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const oldProduct = products.find(p => p.id === id);
    if (!oldProduct) return;
    
    saveLastAction("updateProduct", { id, oldData: { ...oldProduct } });
    
    try {
      await updateProductInDb(id, updates);
      
      setProducts(products.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
      
      toast({ title: "Product Updated", description: `${oldProduct.name} was updated.` });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update product.", 
        variant: "destructive" 
      });
    }
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    saveLastAction("deleteProduct", { product });
    
    try {
      await deleteProductFromDb(id);

      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Product Deleted", description: `${product.name} was removed from inventory.` });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete product.", 
        variant: "destructive" 
      });
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

    saveLastAction("recordSale", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    try {
      const now = new Date();
      
      const saleData = {
        date: now.toISOString(),
        total_amount: product.sellPrice * quantity,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { id: saleId, sale: newSale } = await recordSaleInDb(saleData);
      
      await updateProductStock(productId, product.stockQuantity - quantity);
      
      const newTransactionData = {
        product_id: productId,
        product_name: product.name,
        quantity,
        price: product.sellPrice * quantity,
        type: 'sale',
        date: now.toISOString(),
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User',
        sale_id: saleId
      };
      
      const newTransaction = await recordTransactionInDb(newTransactionData);

      setProducts(products.map(p =>
        p.id === productId
          ? { ...p, stockQuantity: p.stockQuantity - quantity }
          : p
      ));
      
      const saleWithItems: Sale = {
        ...newSale,
        items: [newTransaction]
      };
      
      setSales([saleWithItems, ...sales]);
      setTransactions([newTransaction, ...transactions]);
      
      toast({ title: "Sale Recorded", description: `Sold ${quantity} ${product.name}.` });
    } catch (error) {
      console.error('Error recording sale:', error);
      toast({ 
        title: "Error", 
        description: "Failed to record sale.", 
        variant: "destructive" 
      });
    }
  };
  
  const recordBulkSale = async (items: {product: Product, quantity: number}[]) => {
    if (items.length === 0) return;
    
    for (const item of items) {
      if (item.product.stockQuantity < item.quantity) {
        toast({ 
          title: "Error", 
          description: `Not enough ${item.product.name} in stock.`, 
          variant: "destructive" 
        });
        return;
      }
    }
    
    try {
      const now = new Date();
      const totalAmount = items.reduce(
        (sum, item) => sum + (item.product.sellPrice * item.quantity), 
        0
      );
      
      const saleData = {
        date: now.toISOString(),
        total_amount: totalAmount,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { id: saleId, sale: newSale } = await recordSaleInDb(saleData);
      
      const newTransactions: any[] = [];
      const productUpdatesPromises: Promise<any>[] = [];
      
      for (const item of items) {
        newTransactions.push({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.sellPrice * item.quantity,
          type: 'sale',
          date: now.toISOString(),
          user_id: user?.id || 'unknown',
          user_name: user?.name || 'Unknown User',
          sale_id: saleId
        });
        
        const promise = updateProductStock(item.product.id, item.product.stockQuantity - item.quantity);
        productUpdatesPromises.push(promise);
      }
      
      const newLocalTransactions = await recordBulkTransactionsInDb(newTransactions);
      
      await Promise.all(productUpdatesPromises);
      
      setProducts(products.map(p => {
        const soldItem = items.find(item => item.product.id === p.id);
        if (soldItem) {
          return { ...p, stockQuantity: p.stockQuantity - soldItem.quantity };
        }
        return p;
      }));
      
      const saleWithItems: Sale = {
        ...newSale,
        items: newLocalTransactions
      };
      
      setSales([saleWithItems, ...sales]);
      setTransactions([...newLocalTransactions, ...transactions]);
      
      toast({ 
        title: "Sale Completed", 
        description: `Sold ${items.length} different products.` 
      });
    } catch (error) {
      console.error('Error recording bulk sale:', error);
      toast({ 
        title: "Error", 
        description: "Failed to process sale.", 
        variant: "destructive" 
      });
      throw error;
    }
  };

  const recordRestock = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    saveLastAction("recordRestock", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    try {
      const now = new Date();
      
      await updateProductStock(productId, product.stockQuantity + quantity);
      await updateProductRestockDate(productId, now);

      const newTransactionData = {
        product_id: productId,
        product_name: product.name,
        quantity,
        price: product.costPrice * quantity,
        type: 'restock',
        date: now.toISOString(),
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactionData)
        .select();

      if (insertError) {
        throw insertError;
      }

      const updatedProducts = products.map(p =>
        p.id === productId
          ? { 
              ...p, 
              stockQuantity: p.stockQuantity + quantity,
              lastRestocked: now
            }
          : p
      );
      setProducts(updatedProducts);
      
      if (data && data.length > 0) {
        const newLocalTransaction: Transaction = {
          id: data[0].id,
          productId,
          productName: product.name,
          quantity,
          price: product.costPrice * quantity,
          type: "restock",
          date: now,
          userId: data[0].user_id,
          userName: data[0].user_name
        };
        
        setTransactions([newLocalTransaction, ...transactions]);
        setLastRestockDate(now);
      }
      
      toast({ title: "Restock Recorded", description: `Added ${quantity} ${product.name} to inventory.` });
    } catch (error) {
      console.error('Error recording restock:', error);
      toast({ 
        title: "Error", 
        description: "Failed to record restock.", 
        variant: "destructive" 
      });
    }
  };

  const adjustInventory = async (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    saveLastAction("adjustInventory", { 
      productId, 
      oldQuantity: product.stockQuantity 
    });

    try {
      const difference = newQuantity - product.stockQuantity;
      const now = new Date();
      
      await updateProductStock(productId, newQuantity);

      const newTransactionData = {
        product_id: productId,
        product_name: product.name,
        quantity: Math.abs(difference),
        price: 0,
        type: 'adjustment',
        date: now.toISOString(),
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactionData)
        .select();

      if (insertError) {
        throw insertError;
      }

      const updatedProducts = products.map(p =>
        p.id === productId
          ? { ...p, stockQuantity: newQuantity }
          : p
      );
      setProducts(updatedProducts);
      
      if (data && data.length > 0) {
        const newLocalTransaction: Transaction = {
          id: data[0].id,
          productId,
          productName: product.name,
          quantity: Math.abs(difference),
          price: 0,
          type: "adjustment",
          date: now,
          userId: data[0].user_id,
          userName: data[0].user_name
        };
        
        setTransactions([newLocalTransaction, ...transactions]);
      }
      
      toast({ 
        title: "Inventory Adjusted", 
        description: `${product.name} quantity updated to ${newQuantity}.` 
      });
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast({ 
        title: "Error", 
        description: "Failed to adjust inventory.", 
        variant: "destructive" 
      });
    }
  };

  const updateLastRestockDate = async () => {
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

  const undoLastTransaction = async () => {
    if (!lastAction) {
      toast({ title: "No Action to Undo", description: "There is no recent action to undo." });
      return;
    }

    const { action, data } = lastAction;

    try {
      switch (action) {
        case "recordSale":
        case "recordRestock":
        case "adjustInventory":
          await updateProductStock(data.productId, data.oldQuantity);
          
          if (transactions.length > 0) {
            await supabase
              .from('transactions')
              .delete()
              .eq('id', transactions[0].id);
            
            setProducts(products.map(p =>
              p.id === data.productId
                ? { ...p, stockQuantity: data.oldQuantity }
                : p
            ));
            setTransactions(transactions.slice(1));
          }
          break;
          
        case "updateLastRestockDate":
          setLastRestockDate(data.oldDate);
          break;
          
        case "updateProduct":
          const supabaseUpdates: any = {};
          Object.keys(data.oldData).forEach(key => {
            if (key === 'imageUrl') return;
            if (key === 'lastRestocked' && data.oldData[key]) {
              supabaseUpdates.last_restocked = data.oldData[key].toISOString();
              return;
            }
            const snakeCaseKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            supabaseUpdates[snakeCaseKey] = data.oldData[key];
          });
          
          await supabase
            .from('products')
            .update(supabaseUpdates)
            .eq('id', data.id);
          
          setProducts(products.map(p =>
            p.id === data.id
              ? { ...data.oldData }
              : p
          ));
          break;
          
        case "deleteProduct":
          const restoredProduct = data.product;
          const productInsert = {
            id: restoredProduct.id,
            name: restoredProduct.name,
            description: restoredProduct.description,
            stock_quantity: restoredProduct.stockQuantity,
            cost_price: restoredProduct.costPrice,
            sell_price: restoredProduct.sellPrice,
            category: restoredProduct.category,
            low_stock_threshold: restoredProduct.lowStockThreshold,
            size: restoredProduct.size,
            ingredients: restoredProduct.ingredients,
            skin_concerns: restoredProduct.skinConcerns
          };
          
          if (restoredProduct.lastRestocked) {
            productInsert['last_restocked'] = restoredProduct.lastRestocked.toISOString();
          }
          
          const { data: insertedProduct, error: insertError } = await supabase
            .from('products')
            .insert(productInsert)
            .select();
            
          if (insertError) {
            throw insertError;
          }
          
          if (insertedProduct) {
            setProducts([...products, restoredProduct]);
          }
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
      setLastAction(null);
    } catch (error) {
      console.error('Error undoing action:', error);
      toast({ 
        title: "Error", 
        description: "Failed to undo action.", 
        variant: "destructive" 
      });
    }
  };

  const getProduct = (id: string) => {
    return products.find(p => p.id === id);
  };
  
  const getTotalInventoryValue = () => {
    return products.reduce((total, product) => {
      return total + (product.costPrice * product.stockQuantity);
    }, 0);
  };

  return (
    <DataContext.Provider
      value={{
        products,
        transactions,
        sales,
        lastRestockDate,
        addProduct,
        updateProduct,
        deleteProduct,
        recordSale,
        recordBulkSale,
        recordRestock,
        adjustInventory,
        updateLastRestockDate,
        undoLastTransaction,
        getProduct,
        isLoading,
        getTotalInventoryValue
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
