import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { Product, TransactionInput } from "../models/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Edit, Plus, Trash2, PackageOpen, RefreshCw } from "lucide-react";
import { formatCurrency } from "../lib/format";
import { supabase } from "../integrations/supabase/client";
import { recordTransactionInDb } from "../services/transactionService";
import usePageTitle from "../hooks/usePageTitle";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (product: Product) => void;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Omit<Product, 'id'>) => void;
}

const Inventory = () => {
  usePageTitle("Inventory");
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const categories = ["All", ...new Set(products.map((product) => product.category))];

  const filteredProducts = products.filter((product) => {
    const categoryMatch = selectedCategory === "All" || product.category === selectedCategory;
    const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inventory</CardTitle>
          <CardDescription>Manage your products, track stock levels, and record restocks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="search">Search:</Label>
              <Input
                type="search"
                id="search"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="category">Category:</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
          <ScrollArea className="my-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      {product.stockQuantity <= product.lowStockThreshold ? (
                        <span className="text-red-500 font-bold">{product.stockQuantity}</span>
                      ) : (
                        product.stockQuantity
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(product.costPrice)}</TableCell>
                    <TableCell>{formatCurrency(product.sellPrice)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(product)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(product.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={selectedProduct}
        onSave={async (updatedProduct) => {
          if (selectedProduct) {
            await updateProduct(selectedProduct.id, updatedProduct);
            setIsEditModalOpen(false);
          }
        }}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={async (newProduct) => {
          await addProduct(newProduct);
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
};

interface InputProps {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const InputField: React.FC<InputProps> = ({ label, id, type, value, onChange, required }) => (
  <div className="grid w-full max-w-sm items-center gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input type={type} id={id} value={value} onChange={onChange} required={required} />
  </div>
);

interface TextAreaProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextAreaField: React.FC<TextAreaProps> = ({ label, id, value, onChange }) => (
  <div className="grid w-full max-w-sm items-center gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input as="textarea" id={id} value={value} onChange={onChange} />
  </div>
);

interface EditProductFormProps {
  product: Product;
  onSave: (updates: Partial<Product>) => Promise<void>;
  onClose: () => void;
}

const EditProductForm: React.FC<EditProductFormProps> = ({ product, onSave, onClose }) => {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [stockQuantity, setStockQuantity] = useState(product.stockQuantity.toString());
  const [costPrice, setCostPrice] = useState(product.costPrice.toString());
  const [sellPrice, setSellPrice] = useState(product.sellPrice.toString());
  const [category, setCategory] = useState(product.category);
  const [lowStockThreshold, setLowStockThreshold] = useState(product.lowStockThreshold.toString());
  const [size, setSize] = useState(product.size || "");
  const [ingredients, setIngredients] = useState(product.ingredients || "");
  const [skinConcerns, setSkinConcerns] = useState(product.skinConcerns || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim() || !stockQuantity.trim() || !costPrice.trim() || !sellPrice.trim() || !category.trim() || !lowStockThreshold.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const parsedData = {
        name: name.trim(),
        description: description.trim(),
        stockQuantity: parseInt(stockQuantity),
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        category: category.trim(),
        lowStockThreshold: parseInt(lowStockThreshold),
        size: size.trim() || null,
        ingredients: ingredients.trim() || null,
        skinConcerns: skinConcerns.trim() || null
      };

      await onSave(parsedData);
      onClose();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product. Please check the console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
      <InputField label="Name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      <TextAreaField label="Description" id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <InputField label="Stock Quantity" id="stockQuantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} required />
      <InputField label="Cost Price" id="costPrice" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
      <InputField label="Sell Price" id="sellPrice" type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} required />
      <InputField label="Category" id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} required />
      <InputField label="Low Stock Threshold" id="lowStockThreshold" type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} required />
      <InputField label="Size" id="size" type="text" value={size} onChange={(e) => setSize(e.target.value)} />
      <InputField label="Ingredients" id="ingredients" type="text" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
      <InputField label="Skin Concerns" id="skinConcerns" type="text" value={skinConcerns} onChange={(e) => setSkinConcerns(e.target.value)} />

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};

const EditProductModal = ({ isOpen, onClose, product, onSave }: EditProductModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Make changes to your product here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        {product && (
          <EditProductForm
            product={product}
            onSave={async (updates) => {
              if (product) {
                await onSave({ ...product, ...updates });
                onClose();
              }
            }}
            onClose={onClose}
          />
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AddProductFormProps {
  onAdd: (product: Omit<Product, 'id'>) => Promise<void>;
  onClose: () => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [sellPrice, setSellPrice] = useState("0");
  const [category, setCategory] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [size, setSize] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [skinConcerns, setSkinConcerns] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim() || !stockQuantity.trim() || !costPrice.trim() || !sellPrice.trim() || !category.trim() || !lowStockThreshold.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const parsedData: Omit<Product, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        stockQuantity: parseInt(stockQuantity),
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        category: category.trim(),
        lowStockThreshold: parseInt(lowStockThreshold),
        size: size.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        skinConcerns: skinConcerns.trim() || undefined
      };

      await onAdd(parsedData);
      onClose();
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product. Please check the console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
      <InputField label="Name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      <TextAreaField label="Description" id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <InputField label="Stock Quantity" id="stockQuantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} required />
      <InputField label="Cost Price" id="costPrice" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
      <InputField label="Sell Price" id="sellPrice" type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} required />
      <InputField label="Category" id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} required />
      <InputField label="Low Stock Threshold" id="lowStockThreshold" type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} required />
      <InputField label="Size" id="size" type="text" value={size} onChange={(e) => setSize(e.target.value)} />
      <InputField label="Ingredients" id="ingredients" type="text" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
      <InputField label="Skin Concerns" id="skinConcerns" type="text" value={skinConcerns} onChange={(e) => setSkinConcerns(e.target.value)} />

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add Product</Button>
      </div>
    </form>
  );
};

const AddProductModal = ({ isOpen, onClose, onAdd }: AddProductModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>Add a new product to your inventory.</DialogDescription>
        </DialogHeader>
        <AddProductForm onAdd={onAdd} onClose={onClose} />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Inventory;
