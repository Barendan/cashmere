
import { createClient } from '@supabase/supabase-js';
import { Product, Transaction } from '../models/types';

// These would typically come from environment variables
const SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Product-related functions
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
  
  return data || [];
};

export const addProductToDb = async (product: Omit<Product, "id">): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding product:', error);
    throw error;
  }
  
  return data;
};

export const updateProductInDb = async (id: string, updates: Partial<Product>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }
  
  return data;
};

export const deleteProductFromDb = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Transaction-related functions
export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
  
  return data || [];
};

export const addTransactionToDb = async (transaction: Omit<Transaction, "id">): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
  
  return data;
};

// Function to seed the database with initial products
export const seedProducts = async (products: Omit<Product, "id">[]): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .insert(products);
  
  if (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
};
