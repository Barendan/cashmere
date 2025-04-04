
import { Product } from '../models/types';

export const productSeedData: Omit<Product, "id">[] = [
  {
    name: "Facial Wash",
    category: "Cleanser",
    description: "A gentle cleanser suitable for daily use, effectively removing makeup and impurities while leaving the skin pH balanced.",
    size: "7 oz",
    ingredients: "Aloe vera, lactic acid, citric acid",
    skinConcerns: "All skin types",
    sellPrice: 40.00,
    costPrice: 40.00 * 0.5, // Estimating cost price as 50% of selling price
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Facial Wash Oily/Problem",
    category: "Cleanser",
    description: "A cleansing gel formulated for oily and breakout-prone skin, helping to control oil production and blemishes.",
    size: "7 oz",
    ingredients: "Aloe vera, lactic acid, citric acid",
    skinConcerns: "Oily, acne-prone skin",
    sellPrice: 40.00,
    costPrice: 40.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Creamy Cleanser",
    category: "Cleanser",
    description: "A gentle, hydrating cleanser that effectively removes dirt and makeup without stripping the skin of its essential moisture.",
    size: "7 oz",
    ingredients: "Rose hip seed oil, aloe vera, amino acids",
    skinConcerns: "Dry or sensitive skin",
    sellPrice: 43.00,
    costPrice: 43.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Hydrating Toner",
    category: "Toner",
    description: "A toner that hydrates and removes excess dirt, oil, and debris while keeping the skin refreshed.",
    size: "7 oz",
    ingredients: "Water, glycerin, lactic acid",
    skinConcerns: "All skin types",
    sellPrice: 40.00,
    costPrice: 40.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Rejuvenating Serum",
    category: "Serum",
    description: "An age prevention serum formulated with grape fruit stem cell extract and epidermal growth factor to help reduce early signs of visible aging and leave skin glowing.",
    size: "1 oz",
    ingredients: "Grape fruit stem cell extract, epidermal growth factor",
    skinConcerns: "Early signs of aging",
    sellPrice: 92.00,
    costPrice: 92.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Clearskin",
    category: "Moisturizer",
    description: "A lightweight moisturizer that hydrates and soothes normal to oily, breakout-prone, and sensitive skin.",
    size: "1.7 oz",
    ingredients: "Niacinamide, bisabolol, cucumber fruit extract",
    skinConcerns: "Oily, acne-prone skin",
    sellPrice: 56.00,
    costPrice: 56.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Hydrator Plus Broad Spectrum SPF 30",
    category: "Moisturizer",
    description: "A moisturizer that provides broad-spectrum sun protection while hydrating the skin.",
    size: "1.7 oz",
    ingredients: "Octinoxate, zinc oxide",
    skinConcerns: "Sun protection, hydration",
    sellPrice: 55.00,
    costPrice: 55.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Weightless Protection Broad Spectrum SPF 45",
    category: "Moisturizer",
    description: "A lightweight sunscreen that provides broad-spectrum protection with a matte finish.",
    size: "1.7 oz",
    ingredients: "Zinc oxide, octinoxate",
    skinConcerns: "Sun protection",
    sellPrice: 44.00,
    costPrice: 44.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Sheer Tint Broad Spectrum SPF 45",
    category: "Moisturizer",
    description: "A tinted sunscreen providing broad-spectrum protection with a universal tint suitable for most skin tones.",
    size: "1.7 oz",
    ingredients: "Zinc oxide, octinoxate",
    skinConcerns: "Sun protection, even skin tone",
    sellPrice: 50.00,
    costPrice: 50.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  },
  {
    name: "Blemish Control Bar",
    category: "Cleanser",
    description: "A skin purifying cleansing bar for oily skin or those with acne.",
    size: "3.2 oz",
    ingredients: "Salicylic acid, eucalyptus leaf oil",
    skinConcerns: "Oily, acne-prone skin",
    sellPrice: 46.00,
    costPrice: 46.00 * 0.5,
    stockQuantity: 5,
    lowStockThreshold: 3
  }
  // Adding just the first 10 products for brevity
  // In a real scenario, we would add all products
];
