
/**
 * Defines system-level products for special transactions, such as bulk restock operations.
 * The UUID must match the value inserted in the database migration.
 */
export const BULK_RESTOCK_PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

// Helper to determine if a product is the bulk restock system product
export function isBulkRestockProduct(productId: string): boolean {
  return productId === BULK_RESTOCK_PRODUCT_ID;
}

// For backwards compatibility
export function isSystemMonthlyRestockProduct(productId: string): boolean {
  return isBulkRestockProduct(productId);
}
