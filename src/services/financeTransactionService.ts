import { supabase } from "../integrations/supabase/client";
import { FinanceTransaction } from "../models/types";
import type { Tables } from "../integrations/supabase/types";

type FinanceTransactionRow = Tables['finance_transactions']['Row'];
type FinanceTransactionInsert = Tables['finance_transactions']['Insert'];

// Map database row to FinanceTransaction model
export const mapFinanceTransactionRowToFinanceTransaction = (
  row: FinanceTransactionRow
): FinanceTransaction => ({
  id: row.id,
  date: new Date(row.date),
  totalAmount: row.total_amount,
  customerName: row.customer_name || undefined,
  paymentMethod: row.payment_method,
  cashAmount: row.cash_amount,
  tipAmount: row.tip_amount,
  discount: row.discount,
  originalTotal: row.original_total || undefined,
  userId: row.user_id,
  userName: row.user_name,
  notes: row.notes || undefined
});

// Record a finance transaction in the database
export const recordFinanceTransactionInDb = async (
  financeTransactionData: {
    date: string;
    total_amount: number;
    customer_name?: string;
    payment_method: string;
    cash_amount: number;
    tip_amount: number;
    discount: number;
    original_total: number;
    user_id: string;
    user_name: string;
    notes?: string;
  }
): Promise<FinanceTransaction> => {
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(financeTransactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating finance transaction:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create finance transaction record');
  }

  return mapFinanceTransactionRowToFinanceTransaction(data);
};

// Fetch finance transactions by IDs (for joins)
export const fetchFinanceTransactionsByIds = async (
  ids: string[]
): Promise<FinanceTransaction[]> => {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching finance transactions:', error);
    throw error;
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map(row => mapFinanceTransactionRowToFinanceTransaction(row));
};

