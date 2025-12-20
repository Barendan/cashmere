import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  fetchTransactionsPaginated,
  fetchSales,
  fetchSalesByIds,
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
import { recordFinanceTransactionInDb } from "../services/financeTransactionService";

interface ServiceIncome {
  id: string;
  serviceId: string;
  serviceName: string;
  amount: number;  // Final price after discount
  date: Date;
  customerName: string | null;
  category?: string;
  paymentMethod?: string;
  tipAmount?: number;
  discount?: number;
  originalTotal?: number;
  cashAmount?: number;
  financeTransactionId?: string;  // For deduplicating cash calculations
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
  recordBulkSale: (items: {product: Product, quantity: number}[], globalDiscount?: number, paymentMethod?: string) => Promise<void>;
  recordServiceSale: (items: {service: Service, quantity: number}[], globalDiscount?: number, globalTip?: number, globalCustomerName?: string, paymentMethod?: string, cashAmount?: number) => Promise<void>;
  recordMixedSale: (products: {product: Product, quantity: number}[], serviceItems: {service: Service, quantity: number}[], globalDiscount?: number, globalTip?: number, globalCustomerName?: string, paymentMethod?: string, cashAmount?: number) => Promise<void>;
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
  transactionsHasMore: boolean;
  transactionsTotalCount: number;
  loadMoreTransactions: () => Promise<void>;
  fetchAllMetricsData: () => Promise<{
    transactions: Transaction[];
    sales: Sale[];
    serviceIncomes: ServiceIncome[];
  }>;
  metricsCache: {
    transactions: Transaction[];
    sales: Sale[];
    serviceIncomes: ServiceIncome[];
  } | null;
  isLoadingMetrics: boolean;
  refreshMetricsData: () => Promise<void>;
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
  const [transactionsPage, setTransactionsPage] = useState<number>(1);
  const [transactionsHasMore, setTransactionsHasMore] = useState<boolean>(true);
  const [transactionsTotalCount, setTransactionsTotalCount] = useState<number>(0);
  const [metricsCache, setMetricsCache] = useState<{
    transactions: Transaction[];
    sales: Sale[];
    serviceIncomes: ServiceIncome[];
  } | null>(null);
  const [metricsCacheTimestamp, setMetricsCacheTimestamp] = useState<number | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const displayableProducts = products.filter(p => !isBulkRestockProduct(p.id));

  const refreshData = async () => {
    try {
      const [
        transformedProducts,
        transformedServices
      ] = await Promise.all([
        fetchProducts(),
        fetchServices()
      ]);

      setProducts(transformedProducts);
      setServices(transformedServices);
      setServiceIncomes([]);

      const { transactions: firstPageTransactions, hasMore, totalCount } = await fetchTransactionsPaginated(1, 20);
      setTransactions(firstPageTransactions);
      setTransactionsPage(1);
      setTransactionsHasMore(hasMore);
      setTransactionsTotalCount(totalCount);

      // Fetch only sales that match the loaded transactions
      const saleIds = [...new Set(firstPageTransactions.map(t => t.saleId).filter(Boolean) as string[])];
      let matchingSales: Sale[] = [];
      if (saleIds.length > 0) {
        matchingSales = await fetchSalesByIds(saleIds);
      }

      const salesWithItems: Sale[] = matchingSales.map(sale => {
        const saleItems = firstPageTransactions.filter(transaction => transaction.saleId === sale.id);
        return { ...sale, items: saleItems };
      });

      setSales(salesWithItems);

      const restockDate = await getLastRestockDate();
      if (restockDate) {
        setLastRestockDate(restockDate);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error Refreshing Data",
        description: "Failed to refresh data from database.",
        variant: "destructive"
      });
    }
  };

  const loadMoreTransactions = async () => {
    if (!transactionsHasMore) return;
    
    try {
      const nextPage = transactionsPage + 1;
      const { transactions: newTransactions, hasMore, totalCount } = await fetchTransactionsPaginated(nextPage, 20);
      
      const updatedTransactions = [...transactions, ...newTransactions];
      setTransactions(updatedTransactions);
      setTransactionsPage(nextPage);
      setTransactionsHasMore(hasMore);
      setTransactionsTotalCount(totalCount);
      
      // Fetch sales for new transactions that we don't already have
      const existingSaleIds = new Set(sales.map(s => s.id));
      const newSaleIds = [...new Set(newTransactions.map(t => t.saleId).filter(Boolean) as string[])]
        .filter(id => !existingSaleIds.has(id));
      
      let newSales: Sale[] = [];
      if (newSaleIds.length > 0) {
        newSales = await fetchSalesByIds(newSaleIds);
      }
      
      // Merge existing sales with new sales
      const allSales = [...sales, ...newSales];
      
      // Update sales with all transaction items
      const updatedSales = allSales.map(sale => {
        const saleItems = updatedTransactions.filter(t => t.saleId === sale.id);
        return { ...sale, items: saleItems };
      });
      
      setSales(updatedSales);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load more transactions.",
        variant: "destructive"
      });
    }
  };

  const fetchAllMetricsData = useCallback(async () => {
    try {
      // Check if cache exists and is still valid (5 minutes)
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
      const now = Date.now();
      
      if (metricsCache && metricsCacheTimestamp && (now - metricsCacheTimestamp) < CACHE_DURATION) {
        // Return cached data
        return metricsCache;
      }

      // Fetch all data without touching context state
      const [allSales, allServiceIncomes] = await Promise.all([
        fetchSales(),
        fetchServiceIncomes()
      ]);

      // Fetch all transactions in chunks
      let allTransactions: Transaction[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;
      
      while (hasMore) {
        const { transactions: pageTransactions, hasMore: more } = await fetchTransactionsPaginated(page, pageSize);
        allTransactions = [...allTransactions, ...pageTransactions];
        hasMore = more;
        page++;
      }

      const metricsData = {
        transactions: allTransactions,
        sales: allSales,
        serviceIncomes: allServiceIncomes
      };

      // Update cache
      setMetricsCache(metricsData);
      setMetricsCacheTimestamp(now);

      return metricsData;
    } catch (error) {
      console.error('Error in fetchAllMetricsData:', error);
      throw error; // Re-throw so calling code can handle it
    }
  }, [metricsCache, metricsCacheTimestamp]);

  const refreshMetricsData = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      // Clear cache to force refresh
      setMetricsCache(null);
      setMetricsCacheTimestamp(null);
      
      // Fetch fresh data
      const [allSales, allServiceIncomes] = await Promise.all([
        fetchSales(),
        fetchServiceIncomes()
      ]);

      // Fetch all transactions in chunks
      let allTransactions: Transaction[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;
      
      while (hasMore) {
        const { transactions: pageTransactions, hasMore: more } = await fetchTransactionsPaginated(page, pageSize);
        allTransactions = [...allTransactions, ...pageTransactions];
        hasMore = more;
        page++;
      }

      const metricsData = {
        transactions: allTransactions,
        sales: allSales,
        serviceIncomes: allServiceIncomes
      };

      // Update cache
      setMetricsCache(metricsData);
      setMetricsCacheTimestamp(Date.now());
    } catch (error) {
      console.error('Error refreshing metrics data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh metrics data.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [toast]);

  // Helper function to invalidate metrics cache
  const invalidateMetricsCache = useCallback(() => {
    setMetricsCache(null);
    setMetricsCacheTimestamp(null);
  }, []);

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
      const { data, error } = await supabase
        .from('finances')
        .select(`
          id, 
          amount, 
          date, 
          customer_name,
          category,
          service_id,
          payment_method,
          finance_transaction_id,
          services(name),
          finance_transactions:finance_transaction_id (
            id,
            customer_name,
            payment_method,
            cash_amount,
            tip_amount,
            discount,
            original_total
          )
        `)
        .eq('type', 'income')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform data - handle both grouped and legacy records
        const transformedData = data.map(item => {
          const isGrouped = !!item.finance_transaction_id && item.finance_transactions;
          const ft = item.finance_transactions;
          
          // For grouped records: get data from finance_transactions
          // For legacy records: get data from finances (current behavior)
          let customerName: string | null;
          let paymentMethod: string | undefined;
          let tipAmount: number | undefined;
          let discount: number | undefined;
          let originalTotal: number | undefined;
          let cashAmount: number | undefined;
          let finalAmount = item.amount;
          
          if (isGrouped && ft) {
            // Grouped record: read from finance_transactions
            customerName = ft.customer_name;
            paymentMethod = ft.payment_method;
            tipAmount = ft.tip_amount || 0;
            discount = ft.discount || 0;
            originalTotal = ft.original_total || item.amount;
            cashAmount = ft.cash_amount || 0;
            
            // Calculate proportional discount for this service line item
            if (discount > 0 && originalTotal > 0) {
              const discountProportion = item.amount / originalTotal;
              finalAmount = item.amount - (discount * discountProportion);
            }
          } else {
            // Legacy record: read from finances (existing behavior)
            customerName = item.customer_name;
            paymentMethod = item.payment_method || undefined;
            tipAmount = undefined;  // Legacy records don't have tip stored per service
            discount = 0;  // Legacy records don't have discount stored
            originalTotal = item.amount;  // For legacy, amount is final price
            cashAmount = 0;  // Legacy records have no cash split
            finalAmount = item.amount;
          }
          
          return {
            id: item.id,
            serviceId: item.service_id || item.category || "uncategorized",
            serviceName: item.services?.name || item.category || "Uncategorized",
            amount: finalAmount,  // Final price after discount
            date: new Date(item.date),
            customerName: customerName,
            category: item.category,
            paymentMethod: paymentMethod,
            tipAmount: tipAmount,
            discount: discount,
            originalTotal: originalTotal,
            cashAmount: cashAmount,
            financeTransactionId: item.finance_transaction_id || undefined
          };
        });
        
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

    // Invalidate metrics cache since we're adding a new sale
    invalidateMetricsCache();

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

  const recordBulkSale = async (items: {product: Product, quantity: number}[], globalDiscount: number = 0, paymentMethod?: string) => {
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
    
    // Invalidate metrics cache since we're adding new sales
    invalidateMetricsCache();
    
    try {
      const now = new Date();
      const subtotal = items.reduce(
        (sum, item) => sum + (item.product.sellPrice * item.quantity), 
        0
      );
      
      const totalDiscount = globalDiscount;
      
      const finalTotal = Math.max(0, subtotal - totalDiscount);
      
      const saleData = {
        date: now.toISOString(),
        total_amount: finalTotal,
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown User',
        discount: totalDiscount > 0 ? totalDiscount : null,
        tip_amount: null,
        original_total: totalDiscount > 0 ? subtotal : null,
        notes: totalDiscount > 0 ? `Discount: $${totalDiscount.toFixed(2)}` : null,
        payment_method: paymentMethod || null
      };
      
      const { id: saleId, sale: newSale } = await recordSaleInDb(saleData);
      
      const newTransactions: any[] = [];
      const productUpdatesPromises: Promise<any>[] = [];
      
      for (const item of items) {
        const itemTotal = item.product.sellPrice * item.quantity;
        // Distribute global discount proportionally across items
        const itemDiscountShare = subtotal > 0 ? (itemTotal / subtotal) * totalDiscount : 0;
        const finalPrice = Math.max(0, itemTotal - itemDiscountShare);
        
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
      
      try {
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

  const recordServiceSale = async (
    items: {service: Service, quantity: number}[],
    globalDiscount: number = 0,
    globalTip: number = 0,
    globalCustomerName: string = '',
    paymentMethod?: string,
    cashAmount: number = 0
  ) => {
    if (items.length === 0) return;
    
    // Validate paymentMethod is provided
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }
    
    // Invalidate metrics cache since we're adding new service income
    invalidateMetricsCache();
    
    try {
      const now = new Date();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Validate all services exist
      for (const item of items) {
        const serviceExists = services.find(s => s.id === item.service.id);
        if (!serviceExists) {
          throw new Error(`Service ${item.service.name} not found in current service list`);
        }
      }
      
      // Calculate original subtotal (before discount)
      const originalSubtotal = items.reduce((sum, item) => 
        sum + (item.service.price * item.quantity), 0
      );
      
      // Calculate final subtotal (after discount, before tip)
      const finalSubtotal = Math.max(0, originalSubtotal - globalDiscount);
      const finalTotal = finalSubtotal + globalTip;
      
      // Validate cash amount
      let validatedCashAmount = cashAmount;
      if (paymentMethod === 'cash') {
        // If payment is cash-only, cash_amount must equal total
        validatedCashAmount = finalTotal;
      } else if (cashAmount > 0) {
        // If split payment, validate cash doesn't exceed total
        if (cashAmount >= finalTotal) {
          throw new Error('Cash amount cannot exceed or equal total amount in split payment');
        }
      }
      
      // Step 1: Create finance_transaction (summary row)
      const financeTransactionData = {
        date: now.toISOString(),
        total_amount: finalTotal,
        customer_name: globalCustomerName || null,
        payment_method: paymentMethod,
        cash_amount: validatedCashAmount,
        tip_amount: globalTip,
        discount: globalDiscount,
        original_total: originalSubtotal,
        user_id: user.id,
        user_name: user?.name || user?.email || user?.id || 'Unknown User',
        notes: null
      };
      
      const financeTransaction = await recordFinanceTransactionInDb(financeTransactionData);
      
      // Step 2: Create finances rows (line items) - one per service
      const financePromises = items.map(async (item) => {
        const serviceTotal = item.service.price * item.quantity;
        
        // Store ORIGINAL price (not discounted) in finances.amount
        const financeData = {
          type: 'income',
          date: now.toISOString(),
          amount: serviceTotal,  // Original price, not discounted
          description: `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`,
          customer_name: null,  // NULL - read from finance_transactions
          service_id: item.service.id,
          payment_method: null,  // NULL - read from finance_transactions
          tip_amount: null,  // NULL - read from finance_transactions
          finance_transaction_id: financeTransaction.id  // Link to parent transaction
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
      
      // Refresh service incomes to show the new record
      const updatedServiceIncomes = await fetchServiceIncomes();
      setServiceIncomes(updatedServiceIncomes);
      
    } catch (error: any) {
      console.error('Error recording service sale:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to record service sale.", 
        variant: "destructive" 
      });
      throw error;
    }
  };

  const recordMixedSale = async (
    products: {product: Product, quantity: number}[], 
    serviceItems: {service: Service, quantity: number}[], 
    globalDiscount: number = 0,
    globalTip: number = 0,
    globalCustomerName: string = '',
    paymentMethod?: string,
    cashAmount: number = 0
  ) => {
    // Validate paymentMethod is provided
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }
    // Invalidate metrics cache since we're adding new sales/income
    invalidateMetricsCache();
    
    try {
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
      
      // Calculate proportional discount distribution
      const productSubtotal = products.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
      const serviceSubtotal = serviceItems.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
      const totalSubtotal = productSubtotal + serviceSubtotal;
      
      const productDiscountShare = totalSubtotal > 0 ? (productSubtotal / totalSubtotal) * globalDiscount : 0;
      const serviceDiscountShare = totalSubtotal > 0 ? (serviceSubtotal / totalSubtotal) * globalDiscount : 0;
      
      // Process products through existing recordBulkSale
      if (products.length > 0) {
        await recordBulkSale(products, productDiscountShare, paymentMethod);
      }
      
      // Process services through recordServiceSale
      if (serviceItems.length > 0) {
        await recordServiceSale(serviceItems, serviceDiscountShare, globalTip, globalCustomerName, paymentMethod, cashAmount);
      }
      
      toast({ 
        title: "Mixed Sale Completed", 
        description: `Processed ${products.length} product(s) and ${serviceItems.length} service(s).`
      });
    } catch (error: any) {
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

  const deleteTransaction = async (transaction: Transaction): Promise<boolean> => {
    // Invalidate metrics cache since we're deleting a transaction
    invalidateMetricsCache();
    
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
    // Invalidate metrics cache since we're deleting a sale
    invalidateMetricsCache();
    
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
        deleteSale,
        transactionsHasMore,
        transactionsTotalCount,
        loadMoreTransactions,
        fetchAllMetricsData,
        metricsCache,
        isLoadingMetrics,
        refreshMetricsData
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
