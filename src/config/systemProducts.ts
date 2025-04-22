
/**
 * Defines system-level products for special transactions, such as bulk restock operations.
 * The UUID must match the value inserted in the database migration.
 */
export const BULK_RESTOCK_PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

// Helper to determine if a product is the bulk restock system product
export function isBulkRestockProduct(productId: string): boolean {
  return productId === BULK_RESTOCK_PRODUCT_ID;
}

// Renamed from isSystemMonthlyRestockProduct to match the existing function
export function isSystemMonthlyRestockProduct(productId: string): boolean {
  return isBulkRestockProduct(productId);
}

// Helper to identify a parent restock transaction
export function isParentRestockTransaction(transaction: any): boolean {
  return transaction.type === 'restock' && isBulkRestockProduct(transaction.productId || transaction.product_id);
}

// Helper to identify a child restock transaction
export function isChildRestockTransaction(transaction: any): boolean {
  return transaction.type === 'restock' && transaction.parentTransactionId !== null;
}
