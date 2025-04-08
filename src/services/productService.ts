
import { Product } from "../models/types";
import { 
  supabase, 
  mapProductRowToProduct, 
  ProductInsert 
} from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";

export const fetchProducts = async () => {
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*');
  
  if (productsError) {
    throw productsError;
  }

  return productsData.map(row => mapProductRowToProduct(row));
};

export const addProductToDb = async (product: Omit<Product, "id">) => {
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
  };
  
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
    return mapProductRowToProduct(data[0]);
  }
  
  throw new Error("Failed to add product");
};

export const updateProductInDb = async (id: string, updates: Partial<Product>) => {
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
};

export const deleteProductFromDb = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
};
