
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
  // Using the generic rpc function call to avoid type errors
  const { data, error } = await supabase.rpc('get_sales') as { data: RpcSaleResult[] | null, error: any };
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.map(row => mapSaleRowToSale(row));
};

export const recordSaleInDb = async (saleData: any) => {
  // Using the generic rpc function call with proper type casting
  const { data, error } = await supabase.rpc('insert_sale', { p_sale: saleData }) as { data: RpcSaleResult[] | null, error: any };
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Failed to create sale record');
  }
  
  return { id: data[0].id, sale: mapSaleRowToSale(data[0]) };
};

export const recordTransactionInDb = async (transactionData: any) => {
  // Using the generic rpc function call with proper type casting
  const { data, error } = await supabase.rpc('insert_transaction_with_sale', { p_transaction: transactionData }) as { data: RpcTransactionResult[] | null, error: any };
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Failed to create transaction record');
  }
  
  return mapTransactionRowToTransaction(data[0]);
};

export const recordBulkTransactionsInDb = async (transactions: any[]) => {
  // Using the generic rpc function call with proper type casting
  const { data, error } = await supabase.rpc('insert_bulk_transactions', { transactions }) as { data: RpcTransactionResult[] | null, error: any };
  
  if (error) {
    throw error;
  }
  
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.map(t => mapTransactionRowToTransaction(t));
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
