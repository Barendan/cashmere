
/**
 * Defines system-level products for special transactions, such as "Monthly Restock Aggregate".
 * The UUID must match the value inserted in the database migration.
 */
export const MONTHLY_RESTOCK_PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

// Helper to determine if a product is the monthly restock aggregate system product.
export function isSystemMonthlyRestockProduct(productId: string): boolean {
  return productId === MONTHLY_RESTOCK_PRODUCT_ID;
}
