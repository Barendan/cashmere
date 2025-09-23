import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, Transaction, Sale, TransactionInput, Service } from "../models/types";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "./AuthContext";
import { 
  fetchProducts, 
  addProductToDb, 
  updateProductInDb, 
  deleteProductFromDb 
} from "../services/productService";
import { 
  fetchServices, 
  addServiceToDb, 
  updateServiceInDb, 
  deleteServiceFromDb 
} from "../services/serviceService";
import {
  fetchTransactions,
  fetchSales,
  recordSaleInDb,
  recordTransactionInDb,
  recordBulkTransactionsInDb,
  updateProductStock,
  updateProductRestockDate,
  getLastRestockDate,
  recordMonthlyRestockInDb,
  recordChildRestockTransactions,
  getRestockDetails,
  updateMultipleProductStocks,
  deleteTransactionById,
  deleteSaleAndTransactions
} from "../services/transactionService";
import { supabase } from "../integrations/supabase/client";
import { formatCurrency } from "../lib/format";
import { BULK_RESTOCK_PRODUCT_ID, isBulkRestockProduct } from "../config/systemProducts";

interface ServiceIncome {
  id: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  date: Date;
  customerName: string | null;
  category?: string;
}

interface DataContextType {
  products: Product[];
  services: Service[];
  transactions: Transaction[];
  sales: Sale[];
  serviceIncomes: ServiceIncome[];
  lastRestockDate: Date | null;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addService: (service: Omit<Service, "id">) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
  recordSale: (productId: string, quantity: number) => void;
  recordBulkSale: (items: {product: Product, quantity: number, discount: number}[], discount?: number, paymentMethod?: string) => Promise<void>;
  recordServiceSale: (items: {service: Service, quantity: number, discount: number, customerName?: string, tip?: number, notes?: string, serviceDate?: Date}[], paymentMethod?: string) => Promise<void>;
  recordMixedSale: (products: {product: Product, quantity: number, discount: number}[], serviceItems: {service: Service, quantity: number, discount: number, customerName?: string, tip?: number, notes?: string, serviceDate?: Date}[], paymentMethod?: string) => Promise<void>;
  recordRestock: (productId: string, quantity: number) => void;
  updateLastRestockDate: () => void;
  undoLastTransaction: () => void;
  getProduct: (id: string) => Product | undefined;
  getService: (id: string) => Service | undefined;
  recordMonthlyRestock: (productUpdates: {product: Product, newQuantity: number}[]) => Promise<void>;
  recordTransactionInDb: (transactionData: any) => Promise<Transaction>;
  isLoading: boolean;
  getTotalInventoryValue: () => number;
  refreshData: () => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<boolean>;
  deleteSale: (saleId: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceIncomes, setServiceIncomes] = useState<ServiceIncome[]>([]);
  const [lastRestockDate, setLastRestockDate] = useState<Date | null>(null);
  const [lastAction, setLastAction] = useState<{ action: string; data: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const refreshData = async () => {
    try {
      const [
        transformedProducts,
        transformedServices,
        transformedSales,
        transformedTransactions,
        transformedServiceIncomes
      ] = await Promise.all([
        fetchProducts(),
        fetchServices(),
        fetchSales(),
        fetchTransactions(),
        fetchServiceIncomes()
      ]);

      setProducts(transformedProducts);
      setServices(transformedServices);

      const salesWithItems: Sale[] = transformedSales.map(sale => {
        const saleItems = transformedTransactions.filter(transaction => transaction.saleId === sale.id);
        return { ...sale, items: saleItems };
      });

      setSales(salesWithItems);
      setTransactions(transformedTransactions);
      setServiceIncomes(transformedServiceIncomes);

      const restockDate = await getLastRestockDate();
      if (restockDate) {
        setLastRestockDate(restockDate);
      }
      
      console.log(`Loaded ${transformedServiceIncomes.length} service income records`);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error Refreshing Data",
        description: "Failed to refresh data from database.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('products-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        async () => {
          const updatedProducts = await fetchProducts();
          setProducts(updatedProducts);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('services-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        async () => {
          const updatedServices = await fetchServices();
          setServices(updatedServices);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('finances-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finances'
        },
        async () => {
          const updatedServiceIncomes = await fetchServiceIncomes();
          setServiceIncomes(updatedServiceIncomes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchServiceIncomes = async () => {
    try {
      console.log("Fetching service incomes...");
      const { data, error } = await supabase
        .from('finances')
        .select(`
          id, 
          amount, 
          date, 
          customer_name,
          category,
          service_id,
          services(name)
        `)
        .eq('type', 'income')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformedData = data.map(item => ({
          id: item.id,
          serviceId: item.service_id || item.category || "uncategorized",
          serviceName: item.services?.name || item.category || "Uncategorized",
          amount: item.amount,
          date: new Date(item.date),
          customerName: item.customer_name,
          category: item.category
        }));
        
        console.log(`Fetched ${transformedData.length} service income records`);
        console.log("Sample service income data:", transformedData.slice(0, 3));
        return transformedData;
      }

      return [];
    } catch (error) {
      console.error('Error fetching service incomes:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load service income data.", 
        variant: "destructive" 
      });
      return [];
    }
  };

  const saveLastAction = (action: string, data: any) => {
    setLastAction({ action, data });
  };

  const addProduct = async (product: Omit<Product, "id">): Promise<void> => {
    try {
      const newProduct = await addProductToDb(product);
      setProducts([...products, newProduct]);
      toast({ title: "Product Added", description: `${product.name} was added to inventory.` });
      await refreshData();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add product.", 
        variant: "destructive" 
      });
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const oldProduct = products.find(p => p.id === id);
    if (!oldProduct) return;

    try {
      const updatingQuantity =
        updates.stockQuantity !== undefined &&
        updates.stockQuantity !== oldProduct.stockQuantity;

      await updateProductInDb(id, updates);

      setProducts(products.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ));

      if (updatingQuantity && oldProduct) {
        const adjustmentAmount = updates.stockQuantity! - oldProduct.stockQuantity;
        if (adjustmentAmount !== 0) {
          const now = new Date();
          const adjustmentTransaction: TransactionInput = {
            product_id: oldProduct.id,
            product_name: oldProduct.name,
            quantity: adjustmentAmount,
            price: adjustmentAmount * oldProduct.costPrice,
            type: "adjustment",
            date: now,
            user_id: user?.id || 'unknown',
            user_name: user?.name || 'Unknown User',
          };
          await recordTransactionInDb(adjustmentTransaction);
        }
      }

      toast({
        title: "Product Updated",
        description: `${oldProduct.name} was updated.` + 
          (updatingQuantity ? " Adjustment log created." : "")
      });
      await refreshData();
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
      await refreshData();
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
      
      const newTransactionData: TransactionInput = {
        product_id: productId,
        product_name: product.name,
        quantity,
        price: product.sellPrice * quantity,
        type: 'sale',
        date: now,
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
      await refreshData();
    } catch (error) {
      console.error('Error recording sale:', error);
      toast({ 
        title: "Error", 
        description: "Failed to record sale.", 
        variant: "destructive" 
      });
    }
  };

  const recordBulkSale = async (items: {product: Product, quantity: number, discount: number}[], discount: number = 0, paymentMethod?: string) => {
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
      console.log("Starting bulk sale process with items:", items.length);
      const now = new Date();
      const subtotal = items.reduce(
        (sum, item) => sum + (item.product.sellPrice * item.quantity), 
        0
      );
      
      const totalDiscount = items.reduce(
        (sum, item) => sum + item.discount,
        0
      );
      
      const finalTotal = Math.max(0, subtotal - totalDiscount);
      
      const saleData = {
        date: now.toISOString(),
        total_amount: finalTotal,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User',
        discount: totalDiscount > 0 ? totalDiscount : null,
        original_total: totalDiscount > 0 ? subtotal : null,
        notes: totalDiscount > 0 ? `Discount: $${totalDiscount.toFixed(2)}` : null,
        payment_method: paymentMethod || null
      };
      
      console.log("Creating sale record with total:", finalTotal, "total discount:", totalDiscount);
      const { id: saleId, sale: newSale } = await recordSaleInDb(saleData);
      console.log("Sale record created with ID:", saleId);
      
      const newTransactions: any[] = [];
      const productUpdatesPromises: Promise<any>[] = [];
      
      for (const item of items) {
        const itemTotal = item.product.sellPrice * item.quantity;
        const finalPrice = Math.max(0, itemTotal - item.discount);
        
        newTransactions.push({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: finalPrice,
          type: 'sale',
          date: now.toISOString(),
          user_id: user?.id || 'unknown',
          user_name: user?.name || 'Unknown User',
          sale_id: saleId
        });
        
        const promise = updateProductStock(item.product.id, item.product.stockQuantity - item.quantity);
        productUpdatesPromises.push(promise);
      }
      
      console.log("Recording transactions for products:", newTransactions.length);
      try {
        const newLocalTransactions = await recordBulkTransactionsInDb(newTransactions);
        console.log("Transactions recorded successfully:", newLocalTransactions.length);
        
        await Promise.all(productUpdatesPromises);
        console.log("Product stocks updated successfully");
        
        setProducts(products.map(p => {
          const soldItem = items.find(item => item.product.id === p.id);
          if (soldItem) {
            return { ...p, stockQuantity: p.stockQuantity - soldItem.quantity };
          }
          return p;
        }));
        
        const saleWithItems: Sale = {
          ...newSale,
          items: newLocalTransactions,
          discount: totalDiscount > 0 ? totalDiscount : undefined,
          originalTotal: totalDiscount > 0 ? subtotal : undefined,
          paymentMethod: paymentMethod || undefined
        };
        
        setSales([saleWithItems, ...sales]);
        setTransactions([...newLocalTransactions, ...transactions]);
        
        toast({ 
          title: "Sale Completed", 
          description: totalDiscount > 0 ? 
            `Sold ${items.length} item(s) with a $${totalDiscount.toFixed(2)} discount.` : 
            `Sold ${items.length} item(s).` 
        });
        await refreshData();
      } catch (error) {
        console.error('Error in transaction recording:', error);
        toast({ 
          title: "Partial Error", 
          description: "Sale was created but transaction records may be incomplete. Please check inventory.", 
          variant: "destructive" 
        });
        throw error;
      }
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

  const recordServiceSale = async (items: {service: Service, quantity: number, discount: number, customerName?: string, tip?: number, notes?: string, serviceDate?: Date}[], paymentMethod?: string) => {
    if (items.length === 0) return;
    
    try {
      console.log("Starting service sale process with items:", items.length);
      const now = new Date();
      
      // Validate all services exist
      for (const item of items) {
        const serviceExists = services.find(s => s.id === item.service.id);
        if (!serviceExists) {
          throw new Error(`Service ${item.service.name} not found in current service list`);
        }
      }
      
      // Process each service separately as income records
      const financePromises = items.map(async (item) => {
        const serviceTotal = item.service.price * item.quantity;
        const finalPrice = Math.max(0, serviceTotal - item.discount);
        const tipAmount = item.tip || 0;
        
        const financeData = {
          type: 'income',
          date: item.serviceDate?.toISOString() || now.toISOString(),
          amount: finalPrice + tipAmount, // Include tip in the total amount
          description: `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}${item.notes ? ` - ${item.notes}` : ''}`,
          customer_name: item.customerName || null,
          service_id: item.service.id,
          payment_method: paymentMethod || null,
          tip_amount: tipAmount > 0 ? tipAmount : null
        };
        
        const { error } = await supabase
          .from('finances')
          .insert(financeData);
          
        if (error) throw error;
        
        return financeData;
      });
      
      await Promise.all(financePromises);
      
      toast({ 
        title: "Service Sale Completed", 
        description: `Processed ${items.length} service(s) successfully.`
      });
      await refreshData();
    } catch (error) {
      console.error('Error recording service sale:', error);
      toast({ 
        title: "Error", 
        description: `Failed to process service sale: ${error.message}`, 
        variant: "destructive" 
      });
      throw error;
    }
  };

  const recordMixedSale = async (
    products: {product: Product, quantity: number, discount: number}[], 
    serviceItems: {service: Service, quantity: number, discount: number, customerName?: string, tip?: number, notes?: string, serviceDate?: Date}[], 
    paymentMethod?: string
  ) => {
    try {
      console.log("Starting mixed sale process - Products:", products.length, "Services:", serviceItems.length);
      
      // Validate all items before processing
      for (const item of products) {
        const productExists = displayableProducts.find(p => p.id === item.product.id);
        if (!productExists) {
          throw new Error(`Product ${item.product.name} not found`);
        }
      }
      
      for (const item of serviceItems) {
        const serviceExists = services.find(s => s.id === item.service.id);
        if (!serviceExists) {
          throw new Error(`Service ${item.service.name} not found`);
        }
      }
      
      // Process products through existing recordBulkSale
      if (products.length > 0) {
        console.log("Processing products...");
        await recordBulkSale(products, 0, paymentMethod);
      }
      
      // Process services through recordServiceSale
      if (serviceItems.length > 0) {
        console.log("Processing services...");
        await recordServiceSale(serviceItems, paymentMethod);
      }
      
      toast({ 
        title: "Mixed Sale Completed", 
        description: `Processed ${products.length} product(s) and ${serviceItems.length} service(s).`
      });
    } catch (error) {
      console.error('Error recording mixed sale:', error);
      toast({ 
        title: "Error", 
        description: `Failed to process mixed sale: ${error.message}`, 
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
      await refreshData();
    } catch (error) {
      console.error('Error recording restock:', error);
      toast({ 
        title: "Error", 
        description: "Failed to record restock.", 
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

  const recordMonthlyRestock = async (productUpdates: {product: Product, newQuantity: number}[]) => {
    const validUpdates = productUpdates.filter(
      update => update.newQuantity > update.product.stockQuantity
    );
    
    if (validUpdates.length === 0) {
      toast({ 
        title: "No Restocks Needed", 
        description: "All products have sufficient quantity or no increases were specified.", 
        variant: "default" 
      });
      return;
    }
    
    try {
      const totalCost = validUpdates.reduce((sum, update) => {
        const additionalQuantity = update.newQuantity - update.product.stockQuantity;
        return sum + (additionalQuantity * update.product.costPrice);
      }, 0);
      
      const parentTransaction = await recordMonthlyRestockInDb(
        { id: user?.id || 'unknown', name: user?.name || 'Unknown User' }, 
        totalCost
      );
      
      const detailedUpdates = validUpdates.map(update => ({
        productId: update.product.id,
        productName: update.product.name,
        oldQuantity: update.product.stockQuantity,
        newQuantity: update.newQuantity,
        costPrice: update.product.costPrice
      }));
      
      const childTransactions = await recordChildRestockTransactions(
        parentTransaction.id,
        detailedUpdates,
        { id: user?.id || 'unknown', name: user?.name || 'Unknown User' }
      );
      
      const dbProductUpdates = validUpdates.map(update => ({
        productId: update.product.id,
        newQuantity: update.newQuantity
      }));
      
      await updateMultipleProductStocks(dbProductUpdates);
      
      setProducts(products.map(p => {
        const update = validUpdates.find(u => u.product.id === p.id);
        if (update) {
          return { 
            ...p, 
            stockQuantity: update.newQuantity,
            lastRestocked: new Date()
          };
        }
        return p;
      }));
      
      const now = new Date();
      setLastRestockDate(now);
      
      setTransactions([parentTransaction, ...childTransactions, ...transactions]);
      
      toast({ 
        title: "Monthly Restock Complete", 
        description: `Restocked ${validUpdates.length} products for ${formatCurrency(totalCost)}`,
      });
      
    } catch (error) {
      console.error('Error performing monthly restock:', error);
      toast({ 
        title: "Error", 
        description: "Failed to complete monthly restock.", 
        variant: "destructive" 
      });
    }
  };

  // Service management functions
  const addService = async (service: Omit<Service, "id">): Promise<void> => {
    try {
      const newService = await addServiceToDb(service);
      setServices([...services, newService]);
      toast({ title: "Service Added", description: `${service.name} was added.` });
      await refreshData();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add service.", 
        variant: "destructive" 
      });
    }
  };

  const handleUpdateService = async (id: string, updates: Partial<Service>) => {
    const oldService = services.find(s => s.id === id);
    if (!oldService) return;

    try {
      await updateServiceInDb(id, updates);
      setServices(services.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ));
      toast({ title: "Service Updated", description: `${oldService.name} was updated.` });
      await refreshData();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update service.",
        variant: "destructive"
      });
    }
  };

  const deleteService = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    try {
      await deleteServiceFromDb(id);
      setServices(services.filter(s => s.id !== id));
      toast({ title: "Service Deleted", description: `${service.name} was removed.` });
      await refreshData();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete service.", 
        variant: "destructive" 
      });
    }
  };

  const getProduct = (id: string) => {
    if (isBulkRestockProduct(id)) return undefined;
    return products.find(p => p.id === id);
  };

  const getService = (id: string) => {
    return services.find(s => s.id === id);
  };

  const displayableProducts = products.filter(p => !isBulkRestockProduct(p.id));

  const deleteTransaction = async (transaction: Transaction): Promise<boolean> => {
    try {
      if (transaction.type === 'sale') {
        const product = products.find(p => p.id === transaction.productId);
        if (product) {
          await updateProductStock(transaction.productId, product.stockQuantity + transaction.quantity);
        }
      } else if (transaction.type === 'restock') {
        const product = products.find(p => p.id === transaction.productId);
        if (product) {
          const newQuantity = Math.max(0, product.stockQuantity - transaction.quantity);
          await updateProductStock(transaction.productId, newQuantity);
        }
      }
      
      await deleteTransactionById(transaction.id);
      
      setTransactions(prevTransactions => 
        prevTransactions.filter(t => t.id !== transaction.id)
      );
      
      toast({
        title: "Transaction Deleted",
        description: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} transaction has been deleted.`
      });
      
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSale = async (saleId: string): Promise<boolean> => {
    try {
      const saleTransactions = transactions.filter(t => t.saleId === saleId);
      
      for (const transaction of saleTransactions) {
        if (transaction.type === 'sale') {
          const product = products.find(p => p.id === transaction.productId);
          if (product) {
            await updateProductStock(transaction.productId, product.stockQuantity + transaction.quantity);
          }
        }
      }
      
      await deleteSaleAndTransactions(saleId);
      
      setTransactions(prevTransactions => 
        prevTransactions.filter(t => t.saleId !== saleId)
      );
      
      setSales(prevSales =>
        prevSales.filter(s => s.id !== saleId)
      );
      
      toast({
        title: "Sale Deleted",
        description: "Sale and all associated transactions have been deleted."
      });
      
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete sale.",
        variant: "destructive"
      });
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        products: displayableProducts,
        services,
        transactions,
        sales,
        serviceIncomes,
        lastRestockDate,
        addProduct,
        updateProduct: handleUpdateProduct,
        deleteProduct,
        addService,
        updateService: handleUpdateService,
        deleteService,
        recordSale,
        recordBulkSale,
        recordServiceSale,
        recordMixedSale,
        recordRestock,
        updateLastRestockDate,
        undoLastTransaction,
        getProduct,
        getService,
        recordMonthlyRestock,
        recordTransactionInDb,
        isLoading,
        getTotalInventoryValue: () =>
          displayableProducts.reduce((total, product) => {
            return total + product.costPrice * product.stockQuantity;
          }, 0),
        refreshData,
        deleteTransaction,
        deleteSale
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
