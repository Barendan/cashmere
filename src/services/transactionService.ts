
import { supabase, RpcSaleResult, RpcTransactionResult, mapTransactionRowToTransaction, ExtendedTransactionInsert, mapSaleRowToSale, SaleInsert } from "../integrations/supabase/client";
import { Product, Sale, Transaction } from "../models/types";

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

export const recordTransactionInDb = async (transactionData: any) => {
  // Using proper RPC call pattern
  const { data, error } = await supabase
    .rpc('insert_transaction_with_sale', { 
      p_transaction: transactionData 
    });
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Failed to create transaction record');
  }
  
  return mapTransactionRowToTransaction(data[0]);
};

export const recordBulkTransactionsInDb = async (transactions: any[]) => {
  console.log("Original transactions:", JSON.stringify(transactions));
  
  // Format transactions to ensure proper UUID handling
  const formattedTransactions = transactions.map(tx => {
    // Make sure we send the product_id as a plain string
    // The PostgreSQL function will handle the UUID conversion with explicit casting
    return {
      product_id: tx.product_id.toString(), // Ensure it's a string
      product_name: tx.product_name,
      quantity: tx.quantity,
      price: tx.price,
      type: tx.type,
      date: tx.date,
      user_id: tx.user_id,
      user_name: tx.user_name,
      sale_id: tx.sale_id ? tx.sale_id.toString() : null // Also ensure sale_id is a string if present
    };
  });
  
  console.log("Formatted transactions:", JSON.stringify(formattedTransactions));

  try {
    // Using proper RPC call pattern with the formatted transactions
    const { data, error } = await supabase
      .rpc('insert_bulk_transactions', { 
        transactions: formattedTransactions 
      });
    
    if (error) {
      console.error("Transaction error:", error);
      throw error;
    }
    
    if (!data || !Array.isArray(data)) {
      console.error("No data returned from insert_bulk_transactions");
      return [];
    }
    
    console.log("Transaction success, records:", data.length);
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
