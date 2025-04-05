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
