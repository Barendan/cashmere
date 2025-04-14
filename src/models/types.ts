
export interface Product {
  id: string;
  name: string;
  description: string;
  stockQuantity: number;
  costPrice: number;
  sellPrice: number;
  category: string;
  lowStockThreshold: number;
  imageUrl?: string;
  lastRestocked?: Date;
  size?: string;
  ingredients?: string;
  skinConcerns?: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  date: Date;
  userId: string;
  userName: string;
  saleId?: string;
  discount?: number;           // Added for discount tracking
  originalPrice?: number;      // Added for original price before discount
}

export interface Sale {
  id: string;
  date: Date;
  totalAmount: number;
  userId: string;
  userName: string;
  paymentMethod?: string;
  notes?: string;
  items?: Transaction[];
  discount?: number;
  originalTotal?: number;
}

export interface SalesData {
  day: string;
  revenue: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  profit: number;
}

export interface RestockHistory {
  id: string;
  date: Date;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
  }[];
  userId: string;
  userName: string;
}

// New types for finance tracking
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  date: Date;
  amount: number;
  description?: string;
  
  // Income specific fields
  customerName?: string;
  serviceId?: string;
  paymentMethod?: string;
  
  // Expense specific fields
  vendor?: string;
  category?: string;
}
