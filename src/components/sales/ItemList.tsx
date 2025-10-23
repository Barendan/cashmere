import React, { useState } from 'react';
import { Product, Service } from '@/models/types';
import ProductCard from './ProductCard';
import ServiceCard from './ServiceCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Package, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isBulkRestockProduct } from "@/config/systemProducts";

interface ItemListProps {
  products: Product[];
  services: Service[];
}

const ItemList = ({ products, services }: ItemListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("products");
  const { addItem, removeItem, isItemInCart } = useCart();
  
  // Filter products to only show those available for sale, with stock, and not bulk restock products
  const availableProducts = products
    .filter((product) => 
      product.stockQuantity > 0 && 
      !isBulkRestockProduct(product.id) &&
      product.forSale !== false // Only show products that are for sale (true or undefined defaults to true)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Filter services to only show active ones
  const availableServices = services
    .filter((service) => service.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredProducts = availableProducts.filter(product => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return product.name.toLowerCase().includes(searchLower) ||
           (product.description && product.description.toLowerCase().includes(searchLower));
  });
  
  const filteredServices = availableServices.filter(service => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return service.name.toLowerCase().includes(searchLower) ||
           (service.description && service.description.toLowerCase().includes(searchLower));
  });
  
  const handleAddToCart = (item: Product | Service, type: 'product' | 'service') => {
    addItem(item, type);
  };

  const handleRemoveFromCart = (item: Product | Service) => {
    removeItem(item.id);
  };
  
  return (
    <Card className="lg:col-span-3 flex flex-col overflow-hidden h-full bg-gradient-to-r from-[#f5faf8] to-[#e5f4ed]/50">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-spa-deep">Available Items</CardTitle>
        <CardDescription>Select products and services to add to cart</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-6 pt-2 overflow-hidden h-[calc(100%-85px)]">
        <div className="mb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" 
              placeholder={`Search ${activeTab}...`}
              className="pl-8 border-spa-sand"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-3 flex-shrink-0">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({availableProducts.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Services ({availableServices.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="flex-grow flex flex-col m-0">
            <ScrollArea 
              className="flex-grow overflow-auto max-h-[40vh] md:max-h-[50vh] lg:max-h-[55vh] pr-4 pt-2 scrollbar-thin scrollbar-thumb-spa-sand"
              style={{ scrollBehavior: 'smooth' }}
            >
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map((product, index) => (
                    <ProductCard 
                      key={product.id}
                      product={product}
                      onAddToCart={(product) => handleAddToCart(product, 'product')}
                      onRemoveFromCart={handleRemoveFromCart}
                      isInCart={isItemInCart(product.id)}
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
          </TabsContent>
          
          <TabsContent value="services" className="flex-grow flex flex-col m-0">
            <ScrollArea 
              className="flex-grow overflow-auto max-h-[40vh] md:max-h-[50vh] lg:max-h-[55vh] pr-4 pt-2 scrollbar-thin scrollbar-thumb-spa-sand"
              style={{ scrollBehavior: 'smooth' }}
            >
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredServices.map((service) => (
                    <ServiceCard 
                      key={service.id}
                      service={service}
                      onAddToCart={(service) => handleAddToCart(service, 'service')}
                      onRemoveFromCart={handleRemoveFromCart}
                      isInCart={isItemInCart(service.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground flex items-center justify-center h-full">
                  <div>
                    <p>No services found</p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 
                        "Try a different search term" : 
                        "There are no active services available"}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ItemList;