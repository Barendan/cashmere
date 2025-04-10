import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { Product } from "../models/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Edit, Plus, DollarSign, Archive, Boxes } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import usePageTitle from "@/hooks/usePageTitle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";

const InventoryPage = () => {
  usePageTitle("Inventory");
  const { products, addProduct, updateProduct, deleteProduct, getTotalInventoryValue } = useData();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: "",
    description: "",
    category: "Skincare",
    costPrice: 0,
    sellPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 5,
  });
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [thresholdValue, setThresholdValue] = useState(5);

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [isAdmin, toast]);

  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };
  const openRestockModal = (product: Product) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
  };
  const closeRestockModal = () => {
    setIsRestockModalOpen(false);
    setSelectedProduct(null);
    setRestockQuantity(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleAddProduct = async () => {
    try {
      await addProduct(newProduct);
      toast({
        title: "Success",
        description: "Product added successfully.",
      });
      closeAddModal();
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    try {
      await updateProduct(selectedProduct.id, selectedProduct);
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
      closeEditModal();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
      closeEditModal();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestock = async () => {
    if (!selectedProduct) return;
    try {
      await updateProduct(selectedProduct.id, {
        ...selectedProduct,
        stockQuantity: selectedProduct.stockQuantity + restockQuantity,
      });
      toast({
        title: "Success",
        description: "Product restocked successfully.",
      });
      closeRestockModal();
    } catch (error) {
      console.error("Error restock product:", error);
      toast({
        title: "Error",
        description: "Failed to restock product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyThreshold = () => {
    products.forEach(product => {
      updateProduct(product.id, { lowStockThreshold: thresholdValue });
    });
    
    toast({
      title: "Success",
      description: "Low stock threshold updated for all products.",
    });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalInventoryValue = getTotalInventoryValue();
  const lowStockCount = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
  const totalProductCount = products.length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        <p className="text-muted-foreground">Add, edit and track your inventory</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-spa-deep flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Inventory Value
            </CardTitle>
            <CardDescription>Total value of current inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalInventoryValue)}</div>
            <p className="text-muted-foreground text-sm mt-1">Based on cost price</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                {totalProductCount} Products
              </Badge>
              {outOfStockCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                  {outOfStockCount} Out of Stock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-spa-deep flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </CardTitle>
            <CardDescription>Add a new product to inventory</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[100px]">
            <Button onClick={openAddModal} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-spa-deep flex items-center">
              <Archive className="h-4 w-4 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Set threshold for all products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                  {lowStockCount} Low Stock Items
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Input 
                  id="threshold"
                  type="number" 
                  value={thresholdValue}
                  onChange={e => setThresholdValue(parseInt(e.target.value) || 0)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleApplyThreshold}>
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>View and modify your product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product, index) => (
                      <TableRow 
                        key={product.id}
                        className={
                          product.stockQuantity === 0 
                            ? "bg-red-50" 
                            : index % 2 === 0 
                              ? "bg-white" 
                              : "bg-gray-50"
                        }
                      >
                        <TableCell className="font-medium">
                          <div>
                            {product.name}
                            {product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0 && (
                              <Badge 
                                variant="outline" 
                                className="bg-amber-50 text-amber-800 border-amber-200 ml-2"
                              >
                                Low Stock
                              </Badge>
                            )}
                            {product.stockQuantity === 0 && (
                              <Badge 
                                variant="outline" 
                                className="bg-red-50 text-red-800 border-red-200 ml-2"
                              >
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {product.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">
                          {product.stockQuantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${product.costPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${product.sellPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openRestockModal(product)}
                            >
                              <Package className="h-4 w-4 mr-1" /> 
                              Restock
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openEditModal(product)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        {searchQuery ? "No products found matching your search." : "No products have been added yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input type="text" id="name" name="name" value={newProduct.name} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" name="description" value={newProduct.description} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Skincare">Skincare</SelectItem>
                  <SelectItem value="Makeup">Makeup</SelectItem>
                  <SelectItem value="Haircare">Haircare</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="costPrice" className="text-right">
                Cost Price
              </Label>
              <Input type="number" id="costPrice" name="costPrice" value={newProduct.costPrice} onChange={handleNumberInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellPrice" className="text-right">
                Sell Price
              </Label>
              <Input type="number" id="sellPrice" name="sellPrice" value={newProduct.sellPrice} onChange={handleNumberInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stockQuantity" className="text-right">
                Stock Quantity
              </Label>
              <Input type="number" id="stockQuantity" name="stockQuantity" value={newProduct.stockQuantity} onChange={handleNumberInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lowStockThreshold" className="text-right">
                Low Stock Threshold
              </Label>
              <Input type="number" id="lowStockThreshold" name="lowStockThreshold" value={newProduct.lowStockThreshold} onChange={handleNumberInputChange} className="col-span-3" />
            </div>
          </div>
          <Button onClick={handleAddProduct} className="w-full">
            Add Product
          </Button>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={selectedProduct.name}
                  onChange={(e) =>
                    setSelectedProduct({ ...selectedProduct, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={selectedProduct.description}
                  onChange={(e) =>
                    setSelectedProduct({ ...selectedProduct, description: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  onValueChange={(value) =>
                    setSelectedProduct({ ...selectedProduct, category: value })
                  }
                  defaultValue={selectedProduct.category}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Skincare">Skincare</SelectItem>
                    <SelectItem value="Makeup">Makeup</SelectItem>
                    <SelectItem value="Haircare">Haircare</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="costPrice" className="text-right">
                  Cost Price
                </Label>
                <Input
                  type="number"
                  id="costPrice"
                  name="costPrice"
                  value={selectedProduct.costPrice}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      costPrice: parseFloat(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sellPrice" className="text-right">
                  Sell Price
                </Label>
                <Input
                  type="number"
                  id="sellPrice"
                  name="sellPrice"
                  value={selectedProduct.sellPrice}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      sellPrice: parseFloat(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stockQuantity" className="text-right">
                  Stock Quantity
                </Label>
                <Input
                  type="number"
                  id="stockQuantity"
                  name="stockQuantity"
                  value={selectedProduct.stockQuantity}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      stockQuantity: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lowStockThreshold" className="text-right">
                  Low Stock Threshold
                </Label>
                <Input
                  type="number"
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  value={selectedProduct.lowStockThreshold}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      lowStockThreshold: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <DialogFooter className="flex justify-between mt-4">
                <Button variant="destructive" onClick={() => selectedProduct && handleDeleteProduct(selectedProduct.id)}>
                  Delete Product
                </Button>
                <Button onClick={handleUpdateProduct}>Update Product</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRestockModalOpen} onOpenChange={setIsRestockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="restockQuantity" className="text-right">
                  Restock Quantity
                </Label>
                <Input
                  type="number"
                  id="restockQuantity"
                  name="restockQuantity"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(parseInt(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <Button onClick={handleRestock} className="w-full">
                Restock Product
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
