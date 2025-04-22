import { supabase } from "../integrations/supabase/client";
import { Transaction, TransactionInput } from "../models/types";
import { BULK_RESTOCK_PRODUCT_ID } from "../config/systemProducts";

// Define a type for mapTransactionRowToTransaction to avoid recursive type issues
type TransactionRow = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  type: string;
  date: string;
  user_id: string;
  user_name: string;
  sale_id?: string | null;
  parent_transaction_id?: string | null;
  [key: string]: any;
};

// Local implementation of the mapping function
const mapTransactionRowToTransaction = (row: TransactionRow): Transaction => {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    price: row.price,
    type: row.type as 'sale' | 'restock' | 'adjustment' | 'return',
    date: new Date(row.date),
    userId: row.user_id,
    userName: row.user_name,
    saleId: row.sale_id || undefined,
    parentTransactionId: row.parent_transaction_id || undefined
  };
};

// Similarly define a type for sale rows
type SaleRow = {
  id: string;
  date: string;
  total_amount: number;
  user_id: string;
  user_name: string;
  payment_method?: string | null;
  notes?: string | null;
  [key: string]: any;
};

// Map sale row to Sale model
const mapSaleRowToSale = (row: SaleRow) => ({
  id: row.id,
  date: new Date(row.date),
  totalAmount: row.total_amount,
  userId: row.user_id,
  userName: row.user_name,
  paymentMethod: row.payment_method || undefined,
  notes: row.notes || undefined,
  discount: row.discount || undefined,
  originalTotal: row.original_total || undefined
});

export const fetchTransactions = async () => {
  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (transactionsError) {
    throw transactionsError;
  }
  
  return transactionsData.map(item => mapTransactionRowToTransaction(item));
};

export const fetchSales = async () => {
  // Using proper RPC call pattern
  const { data, error } = await supabase
    .rpc('get_sales');
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.map(row => mapSaleRowToSale(row));
};

export const recordSaleInDb = async (saleData: any) => {
  // Using proper RPC call pattern
  const { data, error } = await supabase
    .rpc('insert_sale', { 
      p_sale: saleData 
    });
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Failed to create sale record');
  }
  
  return { id: data[0].id, sale: mapSaleRowToSale(data[0]) };
};

export const recordTransactionInDb = async (transactionData: TransactionInput): Promise<Transaction> => {
  // Format the transaction data with proper UUID handling
  const formattedTransaction = {
    ...transactionData,
    date: transactionData.date.toISOString(),
    // Explicitly handle product_id and sale_id, casting will be done by the RPC function
    product_id: transactionData.product_id,
    sale_id: transactionData.sale_id || null,
    parent_transaction_id: transactionData.parent_transaction_id || null
  };

  const { data, error } = await supabase
    .rpc('insert_transaction_with_sale', { 
      p_transaction: formattedTransaction 
    });
  
  if (error) {
    console.error("Transaction insert error:", error);
    throw error;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Failed to create transaction record');
  }
  
  return mapTransactionRowToTransaction(data[0]);
};

export const recordBulkTransactionsInDb = async (transactions: TransactionInput[]) => {
  console.log("Processing transactions for RPC call:", JSON.stringify(transactions));
  
  try {
    // Format transactions for Supabase RPC function
    const formattedTransactions = transactions.map(tx => ({
      product_id: tx.product_id, 
      product_name: tx.product_name,
      quantity: tx.quantity,
      price: tx.price,
      type: tx.type,
      date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
      user_id: tx.user_id,
      user_name: tx.user_name,
      sale_id: tx.sale_id || null,
      parent_transaction_id: tx.parent_transaction_id || null
    }));
    
    console.log("Formatted transactions for RPC:", JSON.stringify(formattedTransactions));
    
    // Use the RPC function designed to bypass RLS
    const { data, error } = await supabase
      .rpc('insert_bulk_transactions', {
        transactions: formattedTransactions
      });
    
    if (error) {
      console.error("RPC transaction insert error:", error);
      throw error;
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("No data returned from RPC transaction insert");
      throw new Error('Failed to create transaction records');
    }
    
    console.log("RPC transaction insert success, records:", data.length);
    return data.map(t => mapTransactionRowToTransaction(t));
  } catch (err) {
    console.error("Exception in recordBulkTransactionsInDb:", err);
    throw err;
  }
};

export const updateProductStock = async (productId: string, newQuantity: number) => {
  const { error } = await supabase
    .from('products')
    .update({ 
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (error) {
    console.log('updateProductStock failed', error)
    throw error;
  }
};

export const updateProductRestockDate = async (productId: string, date: Date) => {
  const { error } = await supabase
    .from('products')
    .update({ 
      last_restocked: date.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (error) {
    throw error;
  }
};

export const getLastRestockDate = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'restock')
    .order('date', { ascending: false })
    .limit(1);
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return new Date(data[0].date);
};

export const recordMonthlyRestockInDb = async (userData: any, totalCost: number) => {
  try {
    const now = new Date();
    
    // Create a single bulk restock transaction - use system product ID but with type "restock"
    const bulkRestockData: TransactionInput = {
      product_id: BULK_RESTOCK_PRODUCT_ID,
      product_name: "Monthly Inventory Restock",
      quantity: 0, // Not applicable for this transaction type
      price: totalCost,
      type: "restock", // Using "restock" type
      date: now,
      user_id: userData.id || "unknown",
      user_name: userData.name || "Unknown User",
    };
    
    // Record the parent/summary transaction
    const parentTransaction = await recordTransactionInDb(bulkRestockData);
    return parentTransaction;
  } catch (err) {
    console.error("Exception in recordMonthlyRestockInDb:", err);
    throw err;
  }
};

export const recordChildRestockTransactions = async (
  parentTransactionId: string, 
  productUpdates: {productId: string, productName: string, oldQuantity: number, newQuantity: number, costPrice: number}[],
  userData: any
) => {
  try {
    const now = new Date();
    const childTransactions: TransactionInput[] = [];
    
    for (const update of productUpdates) {
      const additionalQuantity = update.newQuantity - update.oldQuantity;
      
      if (additionalQuantity > 0) {
        childTransactions.push({
          product_id: update.productId,
          product_name: update.productName,
          quantity: additionalQuantity,
          price: additionalQuantity * update.costPrice,
          type: "restock",
          date: now,
          user_id: userData.id || "unknown",
          user_name: userData.name || "Unknown User",
          parent_transaction_id: parentTransactionId
        });
      }
    }
    
    if (childTransactions.length > 0) {
      return await recordBulkTransactionsInDb(childTransactions);
    }
    
    return [];
  } catch (err) {
    console.error("Exception in recordChildRestockTransactions:", err);
    throw err;
  }
};

export const getRestockDetails = async (parentTransactionId: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('parent_transaction_id', parentTransactionId)
      .order('date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data.map(item => mapTransactionRowToTransaction(item));
  } catch (err) {
    console.error("Exception in getRestockDetails:", err);
    throw err;
  }
};

export const getRestockSummaries = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('product_id', BULK_RESTOCK_PRODUCT_ID)
      .eq('type', 'restock')
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return data.map(item => mapTransactionRowToTransaction(item));
  } catch (err) {
    console.error("Exception in getRestockSummaries:", err);
    throw err;
  }
};

export const updateMultipleProductStocks = async (productUpdates: {productId: string, newQuantity: number}[]) => {
  try {
    // For each product, create an update operation
    const updatePromises = productUpdates.map(update => 
      supabase
        .from('products')
        .update({ 
          stock_quantity: update.newQuantity,
          last_restocked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', update.productId)
    );
    
    // Execute all updates in parallel
    await Promise.all(updatePromises);
    
    return true;
  } catch (error) {
    console.error('Error updating multiple product stocks:', error);
    throw error;
  }
};

// Export the mapping functions so they can be used elsewhere
export { mapTransactionRowToTransaction, mapSaleRowToSale };
