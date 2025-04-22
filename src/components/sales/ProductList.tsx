
import React, { useState } from 'react';
import { Product } from '@/models/types';
import ProductCard from './ProductCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isBulkRestockProduct } from "@/config/systemProducts";

interface ProductListProps {
  products: Product[];
}

const ProductList = ({ products }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { addItem, removeItem, isProductInCart } = useCart();
  
  const availableProducts = products
    .filter((product) => product.stockQuantity > 0 && !isBulkRestockProduct(product.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredProducts = availableProducts.filter(product => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return product.name.toLowerCase().includes(searchLower) ||
           (product.description && product.description.toLowerCase().includes(searchLower));
  });
  
  const handleAddToCart = (product: Product) => {
    addItem(product);
  };
  
  const handleRemoveFromCart = (product: Product) => {
    removeItem(product.id);
  };
  
  return (
    <Card className="lg:col-span-3 flex flex-col overflow-hidden h-full bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/50">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-spa-deep">Available Products</CardTitle>
        <CardDescription>Select products to add to cart</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-6 pt-2 overflow-hidden h-[calc(100%-85px)]">
        <div className="mb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" 
              placeholder="Search products..." 
              className="pl-8 border-spa-sand"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-grow pr-4 pt-2 h-full">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  isInCart={isProductInCart(product.id)}
                  cardStyle={index < 3 ? `design-${index + 1}` : ""}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex items-center justify-center h-full">
              <div>
                <p>No products found</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 
                    "Try a different search term" : 
                    "There are no products with available stock"}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ProductList;
