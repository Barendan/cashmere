import { Sale } from "@/models/types";
import { ServiceIncomeWithCategory } from "./types";

/**
 * Normalize and validate cash amount for a sale or finance transaction.
 * Pure cash: cash_amount equals finalTotal. Split: 0 < cash_amount < finalTotal.
 */
export const validateAndNormalizeCashAmount = (
  paymentMethod: string,
  cashAmount: number,
  finalTotal: number
): number => {
  if (paymentMethod === "cash") {
    return finalTotal;
  }
  if (cashAmount > 0 && cashAmount >= finalTotal) {
    throw new Error(
      "Cash amount cannot exceed or equal total amount in split payment"
    );
  }
  return cashAmount;
};

/**
 * Split an amount across two portions by dollar ratio.
 * Remainder goes to partB (service side) to avoid rounding drift.
 */
export const splitAmountByRatio = (
  amount: number,
  partA: number,
  partB: number
): { a: number; b: number } => {
  if (amount <= 0) {
    return { a: 0, b: 0 };
  }

  const total = partA + partB;
  if (total <= 0) {
    return { a: 0, b: 0 };
  }
  if (partA <= 0) {
    return { a: 0, b: amount };
  }
  if (partB <= 0) {
    return { a: amount, b: 0 };
  }

  const a = amount * (partA / total);
  return { a, b: amount - a };
};

/**
 * Pass-through cash received on a product sale.
 * Split payments: uses stored cash_amount. Pure cash: full total_amount.
 */
export const getProductSalePassThroughCash = (sale: Sale): number => {
  if (sale.cashAmount != null && sale.cashAmount > 0) {
    return sale.cashAmount;
  }
  if (sale.paymentMethod === "cash") {
    return sale.totalAmount;
  }
  return 0;
};

/**
 * Pass-through cash for a service income line.
 * Grouped records: count finance_transactions.cash_amount once per financeTransactionId.
 * Legacy records: full line amount when payment_method is cash.
 */
export const getServicePassThroughCash = (
  income: ServiceIncomeWithCategory,
  seenFinanceTxIds: Set<string>
): number => {
  if (
    income.financeTransactionId &&
    income.cashAmount &&
    income.cashAmount > 0
  ) {
    if (seenFinanceTxIds.has(income.financeTransactionId)) return 0;
    seenFinanceTxIds.add(income.financeTransactionId);
    return income.cashAmount;
  }

  if (income.paymentMethod === "cash") {
    return income.amount;
  }

  return 0;
};

/** Split pass-through cash across taxable and exempt portions of a transaction gross. */
export const allocatePassThroughCash = (
  cash: number,
  taxable: number,
  exempt: number,
  gross: number
): { fromTaxable: number; fromExempt: number } => {
  if (cash <= 0 || gross <= 0) {
    return { fromTaxable: 0, fromExempt: 0 };
  }

  return {
    fromTaxable: cash * (taxable / gross),
    fromExempt: cash * (exempt / gross),
  };
};
