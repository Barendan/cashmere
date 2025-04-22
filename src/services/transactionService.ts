import { supabase, mapTransactionRowToTransaction, mapSaleRowToSale } from "../integrations/supabase/client";
import { Transaction, TransactionInput } from "../models/types";
import { BULK_RESTOCK_PRODUCT_ID } from "../config/systemProducts";

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
  const formattedTransaction = {
    ...transactionData,
    date: transactionData.date.toISOString(),
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
    const formattedTransactions = transactions.map(tx => ({
      product_id: tx.product_id,
      product_name: tx.product_name,
      quantity: tx.quantity,
      price: tx.price,
      type: tx.type,
      date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
      user_id: tx.user_id,
      user_name: tx.user_name,
      sale_id: tx.sale_id,
      parent_transaction_id: tx.parent_transaction_id
    }));
    
    console.log("Formatted transactions for RPC:", JSON.stringify(formattedTransactions));
    
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
    
    const bulkRestockData: TransactionInput = {
      product_id: BULK_RESTOCK_PRODUCT_ID,
      product_name: "Monthly Inventory Restock",
      quantity: 0,
      price: totalCost,
      type: "restock",
      date: now,
      user_id: userData.id || "unknown",
      user_name: userData.name || "Unknown User",
    };
    
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
    
    await Promise.all(updatePromises);
    
    return true;
  } catch (error) {
    console.error('Error updating multiple product stocks:', error);
    throw error;
  }
};
