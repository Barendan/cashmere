import { supabase, mapTransactionRowToTransaction, mapSaleRowToSale } from "../integrations/supabase/client";
import { Transaction, TransactionInput } from "../models/types";
import { MONTHLY_RESTOCK_PRODUCT_ID } from "../config/systemProducts";

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
    sale_id: transactionData.sale_id || null
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

export const recordBulkTransactionsInDb = async (transactions: any[]) => {
  console.log("Processing transactions for RPC call:", JSON.stringify(transactions));
  
  try {
    // Format transactions for Supabase RPC function
    // Remove discount and original_price fields since they are not in the transactions table
    const formattedTransactions = transactions.map(tx => ({
      product_id: tx.product_id, // Pass UUID as string
      product_name: tx.product_name,
      quantity: tx.quantity,
      price: tx.price,
      type: tx.type,
      date: tx.date,
      user_id: tx.user_id,
      user_name: tx.user_name,
      sale_id: tx.sale_id // Pass UUID as string
      // Discount and original_price fields are intentionally omitted
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
    
    // Create a single monthly restock transaction - use SYSTEM PRODUCT ID
    const monthlyRestockData: TransactionInput = {
      product_id: MONTHLY_RESTOCK_PRODUCT_ID,
      product_name: "Monthly Inventory Restock",
      quantity: 0, // Not applicable for this transaction type
      price: totalCost,
      type: "monthly-restock",
      date: now,
      user_id: userData.id || "unknown",
      user_name: userData.name || "Unknown User",
    };
    
    return await recordTransactionInDb(monthlyRestockData);
  } catch (err) {
    console.error("Exception in recordMonthlyRestockInDb:", err);
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
