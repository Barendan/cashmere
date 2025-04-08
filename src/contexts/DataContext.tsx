import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, Transaction, Sale } from "../models/types";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";
import { 
  supabase, 
  ProductRow, 
  ProductInsert, 
  TransactionInsert,
  SaleInsert,
  ExtendedTransactionInsert,
  mapProductRowToProduct,
  mapTransactionRowToTransaction,
  mapSaleRowToSale,
  RpcSaleResult,
  RpcTransactionResult
} from "../integrations/supabase/client";

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
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*');
        
        if (productsError) {
          throw productsError;
        }

        const transformedProducts: Product[] = productsData.map(row => mapProductRowToProduct(row));
        setProducts(transformedProducts);
        
        // Fetch sales using the RPC function
        const { data: salesData, error: salesError } = await supabase
          .rpc('get_sales');
        
        if (salesError) {
          console.error('Error fetching sales:', salesError);
          // Fallback to avoid blocking the app
          setSales([]);
        } else {
          // Transform sales data - make sure we handle the array properly
          const transformedSales: Sale[] = Array.isArray(salesData) && salesData 
            ? salesData.map((row) => mapSaleRowToSale(row as RpcSaleResult))
            : [];
          
          // Fetch transactions
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });
          
          if (transactionsError) {
            throw transactionsError;
          }

          const transformedTransactions: Transaction[] = transactionsData.map(item => mapTransactionRowToTransaction(item));
          
          // Associate transactions with sales
          const salesWithItems: Sale[] = transformedSales.map(sale => {
            const saleItems = transformedTransactions.filter(transaction => transaction.saleId === sale.id);
            return { ...sale, items: saleItems };
          });
          
          setSales(salesWithItems);
          setTransactions(transformedTransactions);
        }

        // Get restock dates from transactions
        const { data: restockData, error: restockError } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'restock')
          .order('date', { ascending: false })
          .limit(1);
        
        if (!restockError && restockData && restockData.length > 0) {
          setLastRestockDate(new Date(restockData[0].date));
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
      const productToInsert: ProductInsert = {
        name: product.name,
        description: product.description,
        stock_quantity: product.stockQuantity,
        cost_price: product.costPrice,
        sell_price: product.sellPrice,
        category: product.category,
        low_stock_threshold: product.lowStockThreshold,
        size: product.size,
        ingredients: product.ingredients,
        skin_concerns: product.skinConcerns,
      }
      
      if (product.lastRestocked) {
        productToInsert.last_restocked = product.lastRestocked.toISOString();
      }

      const { data, error } = await supabase
        .from('products')
        .insert(productToInsert)
        .select();
      
      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const newProduct: Product = mapProductRowToProduct(data[0]);
        
        setProducts([...products, newProduct]);
        toast({ title: "Product Added", description: `${product.name} was added to inventory.` });
      }
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
      const supabaseUpdates: Record<string, any> = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.stockQuantity !== undefined) supabaseUpdates.stock_quantity = updates.stockQuantity;
      if (updates.costPrice !== undefined) supabaseUpdates.cost_price = updates.costPrice;
      if (updates.sellPrice !== undefined) supabaseUpdates.sell_price = updates.sellPrice;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.lowStockThreshold !== undefined) supabaseUpdates.low_stock_threshold = updates.lowStockThreshold;
      if (updates.lastRestocked !== undefined) {
        supabaseUpdates.last_restocked = updates.lastRestocked ? updates.lastRestocked.toISOString() : null;
      }
      if (updates.size !== undefined) supabaseUpdates.size = updates.size;
      if (updates.ingredients !== undefined) supabaseUpdates.ingredients = updates.ingredients;
      if (updates.skinConcerns !== undefined) supabaseUpdates.skin_concerns = updates.skinConcerns;
      supabaseUpdates.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('products')
        .update(supabaseUpdates)
        .eq('id', id);

      if (error) {
        throw error;
      }
      
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

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
      
      // Create a new sale using the RPC function
      const saleData = {
        date: now.toISOString(),
        total_amount: product.sellPrice * quantity,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { data: saleResult, error: saleError } = await supabase
        .rpc('insert_sale', { p_sale: saleData });
        
      if (saleError) {
        throw saleError;
      }
      
      if (!saleResult || !Array.isArray(saleResult) || (saleResult as any[]).length === 0) {
        throw new Error('Failed to create sale record');
      }
      
      const saleId = (saleResult as RpcSaleResult[])[0].id;
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: product.stockQuantity - quantity,
          updated_at: now.toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }
      
      // Create transaction record using the RPC function
      const newTransactionData: ExtendedTransactionInsert = {
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
      
      const { data: transData, error: insertError } = await supabase
        .rpc('insert_transaction_with_sale', { p_transaction: newTransactionData });

      if (insertError) {
        console.error('Transaction insertion error:', insertError);
        throw insertError;
      }

      // Update local state
      setProducts(products.map(p =>
        p.id === productId
          ? { ...p, stockQuantity: p.stockQuantity - quantity }
          : p
      ));
      
      // Add the new sale to local state
      if (saleResult && Array.isArray(saleResult) && (saleResult as any[]).length > 0) {
        const newSale = mapSaleRowToSale(saleResult[0] as RpcSaleResult);
        
        if (transData && Array.isArray(transData) && (transData as any[]).length > 0) {
          const newTransaction = mapTransactionRowToTransaction(transData[0] as RpcTransactionResult);
          const saleWithItems: Sale = {
            ...newSale,
            items: [newTransaction]
          };
          
          setSales([saleWithItems, ...sales]);
          setTransactions([newTransaction, ...transactions]);
        }
      }
      
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
    
    // Check stock availability for all items
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
      
      // Create a new sale record
      const saleData = {
        date: now.toISOString(),
        total_amount: totalAmount,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User'
      };
      
      const { data: saleResult, error: saleError } = await supabase
        .rpc('insert_sale', { p_sale: saleData });
        
      if (saleError) {
        throw saleError;
      }
      
      if (!saleResult || !Array.isArray(saleResult) || (saleResult as any[]).length === 0) {
        throw new Error('Failed to create sale record');
      }
      
      const saleId = (saleResult as RpcSaleResult[])[0].id;
      
      // Create transactions and update product stock for each item
      const newTransactions: ExtendedTransactionInsert[] = [];
      const productUpdatesPromises: Promise<any>[] = [];
      
      for (const item of items) {
        // Create transaction record
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
        
        // Update product stock - convert to a proper Promise
        const promise: Promise<any> = supabase
          .from('products')
          .update({ 
            stock_quantity: item.product.stockQuantity - item.quantity,
            updated_at: now.toISOString()
          })
          .eq('id', item.product.id)
          .then(result => result);
          
        productUpdatesPromises.push(promise);
      }
      
      // Insert all transactions at once using the RPC function
      const { data: transactionsData, error: transactionsError } = await supabase
        .rpc('insert_bulk_transactions', { transactions: newTransactions });
        
      if (transactionsError) {
        throw transactionsError;
      }
      
      // Wait for all product updates
      await Promise.all(productUpdatesPromises);
      
      // Update local state
      setProducts(products.map(p => {
        const soldItem = items.find(item => item.product.id === p.id);
        if (soldItem) {
          return { ...p, stockQuantity: p.stockQuantity - soldItem.quantity };
        }
        return p;
      }));
      
      // Add the new sale and transactions to local state
      if (saleResult && Array.isArray(saleResult) && (saleResult as any[]).length > 0) {
        const newSale = mapSaleRowToSale(saleResult[0] as RpcSaleResult);
        
        if (transactionsData && Array.isArray(transactionsData) && (transactionsData as any[]).length > 0) {
          const newLocalTransactions = (transactionsData as RpcTransactionResult[]).map(t => 
            mapTransactionRowToTransaction(t)
          );
          
          const saleWithItems: Sale = {
            ...newSale,
            items: newLocalTransactions
          };
          
          setSales([saleWithItems, ...sales]);
          setTransactions([...newLocalTransactions, ...transactions]);
        }
      }
      
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
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: product.stockQuantity + quantity,
          last_restocked: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      const newTransactionData: TransactionInsert = {
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
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: now.toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      const newTransactionData: TransactionInsert = {
        product_id: productId,
        product_name: product.name,
        quantity: Math.abs(difference),
        price: 0, // No price impact for adjustment
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
          await supabase
            .from('products')
            .update({ 
              stock_quantity: data.oldQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.productId);
          
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
            if (key === 'imageUrl') return; // Skip imageUrl as it's not in database schema
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
          const productInsert: ProductInsert = {
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
            productInsert.last_restocked = restoredProduct.lastRestocked.toISOString();
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
