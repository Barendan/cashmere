
import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Product } from "../models/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  PackagePlus,
  Calendar,
  Edit,
  Trash2,
  RefreshCw,
  Undo2,
  Search,
  Info,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";

const Inventory = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    recordRestock,
    lastRestockDate,
    updateLastRestockDate,
    undoLastTransaction,
    isLoading,
    error,
  } = useData();
  
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    stockQuantity: 0,
    costPrice: 0,
    sellPrice: 0,
    category: "",
    lowStockThreshold: 5,
    size: "",
    ingredients: "",
    skinConcerns: "",
  });
  const [restockAmount, setRestockAmount] = useState(0);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-700 mb-4">
        <h3 className="font-semibold mb-2">Error Loading Data</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Filter products based on search term
  const filteredProducts = products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Separate in-stock and out-of-stock products
  const inStockProducts = filteredProducts.filter((product) => product.stockQuantity > 0);
  const outOfStockProducts = filteredProducts.filter((product) => product.stockQuantity === 0);

  // Calculate total inventory value
  const totalInventoryValue = products.reduce(
    (total, product) => total + product.costPrice * product.stockQuantity,
    0
  );
  
  // Calculate total retail value
  const totalRetailValue = products.reduce(
    (total, product) => total + product.sellPrice * product.stockQuantity,
    0
  );

  const handleAddProduct = () => {
    addProduct(newProduct);
    setNewProduct({
      name: "",
      description: "",
      stockQuantity: 0,
      costPrice: 0,
      sellPrice: 0,
      category: "",
      lowStockThreshold: 5,
      size: "",
      ingredients: "",
      skinConcerns: "",
    });
    setIsAddProductOpen(false);
  };

  const handleEditProduct = () => {
    if (selectedProduct) {
      updateProduct(selectedProduct.id, selectedProduct);
      setIsEditProductOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleRestock = () => {
    if (selectedProduct && restockAmount > 0) {
      recordRestock(selectedProduct.id, restockAmount);
      setIsRestockOpen(false);
      setSelectedProduct(null);
      setRestockAmount(0);
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct({ ...product });
    setIsEditProductOpen(true);
  };

  const openRestockModal = (product: Product) => {
    setSelectedProduct({ ...product });
    setRestockAmount(0);
    setIsRestockOpen(true);
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct({ ...product });
    setIsProductDetailsOpen(true);
  };

  const confirmDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct(productId);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleUpdateRestockDate = () => {
    updateLastRestockDate();
  };

  return (
    <div className="w-full space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <h3 className="text-2xl font-semibold mt-1">{products.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-spa-sage/20 flex items-center justify-center">
                <PackagePlus className="h-6 w-6 text-spa-deep" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <h3 className="text-2xl font-semibold mt-1">${totalInventoryValue.toFixed(2)}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-spa-water/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-spa-deep" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Restock</p>
                <h3 className="text-lg font-semibold mt-1">{formatDate(lastRestockDate)}</h3>
              </div>
              <Button
                size="sm"
                className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white mt-2 sm:mt-0"
                onClick={handleUpdateRestockDate}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory management */}
      <Card className="bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-spa-deep">Inventory Management</CardTitle>
            <CardDescription>Manage your product inventory</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="border-spa-sand"
              onClick={() => undoLastTransaction()}
            >
              <Undo2 size={16} className="mr-2" />
              Undo
            </Button>
            <Button
              className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
              onClick={() => setIsAddProductOpen(true)}
            >
              <PlusCircle size={16} className="mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 max-w-xs border-spa-sand"
              />
            </div>
          </div>

          {/* Mobile view - Card-based layout */}
          {isMobile && (
            <div className="space-y-4">
              {inStockProducts.length > 0 ? (
                inStockProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onRestock={() => openRestockModal(product)} 
                    onEdit={() => openEditModal(product)} 
                    onDelete={() => confirmDeleteProduct(product.id)}
                    onDetails={() => openProductDetails(product)}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-md p-4">
                  No products found.
                </div>
              )}
              
              {outOfStockProducts.length > 0 && (
                <>
                  <h3 className="text-lg font-medium mt-8 mb-2">Out of Stock Products</h3>
                  {outOfStockProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onRestock={() => openRestockModal(product)} 
                      onEdit={() => openEditModal(product)} 
                      onDelete={() => confirmDeleteProduct(product.id)}
                      onDetails={() => openProductDetails(product)}
                      outOfStock
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Desktop view - Table-based layout */}
          {!isMobile && (
            <>
              {/* In Stock Products */}
              <div className="rounded-md border border-spa-sand overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Sell Price</TableHead>
                      <TableHead>Last Restocked</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inStockProducts.length > 0 ? (
                      inStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>
                            <span
                              className={
                                product.stockQuantity <= product.lowStockThreshold
                                  ? "text-red-500 font-medium"
                                  : ""
                              }
                            >
                              {product.stockQuantity}
                            </span>
                            {product.stockQuantity <= product.lowStockThreshold && (
                              <Badge variant="outline" className="ml-2 text-xs text-red-500 border-red-200">
                                Low Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>${product.costPrice.toFixed(2)}</TableCell>
                          <TableCell>${product.sellPrice.toFixed(2)}</TableCell>
                          <TableCell>{formatDate(product.lastRestocked)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openProductDetails(product)}
                              >
                                <Info className="h-4 w-4" />
                                <span className="sr-only">Details</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openRestockModal(product)}
                              >
                                <PackagePlus className="h-4 w-4" />
                                <span className="sr-only">Restock</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditModal(product)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500"
                                onClick={() => confirmDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No products found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Out of Stock Products */}
              {outOfStockProducts.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Out of Stock Products</h3>
                  <div className="rounded-md border border-spa-sand overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Cost Price</TableHead>
                          <TableHead>Sell Price</TableHead>
                          <TableHead>Last Restocked</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outOfStockProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>${product.costPrice.toFixed(2)}</TableCell>
                            <TableCell>${product.sellPrice.toFixed(2)}</TableCell>
                            <TableCell>{formatDate(product.lastRestocked)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openProductDetails(product)}
                                >
                                  <Info className="h-4 w-4" />
                                  <span className="sr-only">Details</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openRestockModal(product)}
                                >
                                  <PackagePlus className="h-4 w-4" />
                                  <span className="sr-only">Restock</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditModal(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-500"
                                  onClick={() => confirmDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the details of the new product to add to your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, description: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="size">Size/Volume</Label>
                <Input
                  id="size"
                  value={newProduct.size}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, size: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="ingredients">Ingredients</Label>
                <Input
                  id="ingredients"
                  value={newProduct.ingredients}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, ingredients: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="skinConcerns">Skin Concerns</Label>
                <Input
                  id="skinConcerns"
                  value={newProduct.skinConcerns}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, skinConcerns: e.target.value })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stockQuantity">Initial Stock</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={newProduct.stockQuantity}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      stockQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={newProduct.lowStockThreshold}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={newProduct.costPrice}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sellPrice">Sell Price ($)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  value={newProduct.sellPrice}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      sellPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="border-spa-sand mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              className="border-spa-sand mt-2 sm:mt-0"
              onClick={() => setIsAddProductOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
              onClick={handleAddProduct}
              disabled={!newProduct.name}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details of this product.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <Label htmlFor="edit-name">Product Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedProduct.name}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, name: e.target.value })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={selectedProduct.description}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        description: e.target.value,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    value={selectedProduct.category}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        category: e.target.value,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-size">Size/Volume</Label>
                  <Input
                    id="edit-size"
                    value={selectedProduct.size || ""}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        size: e.target.value,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label htmlFor="edit-ingredients">Ingredients</Label>
                  <Input
                    id="edit-ingredients"
                    value={selectedProduct.ingredients || ""}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        ingredients: e.target.value,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label htmlFor="edit-skinConcerns">Skin Concerns</Label>
                  <Input
                    id="edit-skinConcerns"
                    value={selectedProduct.skinConcerns || ""}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        skinConcerns: e.target.value,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-stockQuantity">Stock Quantity</Label>
                  <Input
                    id="edit-stockQuantity"
                    type="number"
                    value={selectedProduct.stockQuantity}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        stockQuantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="edit-lowStockThreshold"
                    type="number"
                    value={selectedProduct.lowStockThreshold}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        lowStockThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-costPrice">Cost Price ($)</Label>
                  <Input
                    id="edit-costPrice"
                    type="number"
                    step="0.01"
                    value={selectedProduct.costPrice}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        costPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-sellPrice">Sell Price ($)</Label>
                  <Input
                    id="edit-sellPrice"
                    type="number"
                    step="0.01"
                    value={selectedProduct.sellPrice}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        sellPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-spa-sand mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              className="border-spa-sand mt-2 sm:mt-0"
              onClick={() => setIsEditProductOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
              onClick={handleEditProduct}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg">{selectedProduct.name}</h3>
                  <Badge>{selectedProduct.category}</Badge>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{selectedProduct.description}</p>
                </div>
                
                {selectedProduct.size && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Size/Volume</h4>
                    <p>{selectedProduct.size}</p>
                  </div>
                )}
                
                {selectedProduct.ingredients && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Ingredients</h4>
                    <p>{selectedProduct.ingredients}</p>
                  </div>
                )}
                
                {selectedProduct.skinConcerns && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Skin Concerns</h4>
                    <p>{selectedProduct.skinConcerns}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Stock Quantity</h4>
                    <p className={selectedProduct.stockQuantity <= selectedProduct.lowStockThreshold ? "text-red-500 font-medium" : ""}>
                      {selectedProduct.stockQuantity}
                      {selectedProduct.stockQuantity <= selectedProduct.lowStockThreshold && (
                        <Badge variant="outline" className="ml-2 text-xs text-red-500 border-red-200">
                          Low Stock
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Low Stock Threshold</h4>
                    <p>{selectedProduct.lowStockThreshold}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Cost Price</h4>
                    <p>${selectedProduct.costPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Sell Price</h4>
                    <p>${selectedProduct.sellPrice.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Last Restocked</h4>
                  <p>{formatDate(selectedProduct.lastRestocked)}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  className="border-spa-sand"
                  onClick={() => openRestockModal(selectedProduct)}
                >
                  <PackagePlus size={16} className="mr-2" />
                  Restock
                </Button>
                <Button
                  variant="outline"
                  className="border-spa-sand"
                  onClick={() => {
                    setIsProductDetailsOpen(false);
                    openEditModal(selectedProduct);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add inventory to {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="py-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Current Stock:</p>
                <p className="text-lg font-medium">{selectedProduct.stockQuantity}</p>
              </div>
              <Separator className="my-4" />
              <div>
                <Label htmlFor="restock-amount">How many to add?</Label>
                <Input
                  id="restock-amount"
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                  className="border-spa-sand mt-1"
                />
              </div>
              {restockAmount > 0 && (
                <div className="mt-4 p-3 bg-spa-sage/10 rounded-md">
                  <p className="text-sm">
                    Adding {restockAmount} to inventory will set the new stock
                    level to:
                  </p>
                  <p className="text-lg font-medium mt-1">
                    {selectedProduct.stockQuantity + restockAmount} items
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              className="border-spa-sand mt-2 sm:mt-0"
              onClick={() => setIsRestockOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
              onClick={handleRestock}
              disabled={restockAmount <= 0}
            >
              Confirm Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
