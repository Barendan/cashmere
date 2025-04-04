
import React from "react";
import { Product } from "../models/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Edit, Trash2, Info } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onRestock: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDetails: () => void;
  outOfStock?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onRestock,
  onEdit,
  onDelete,
  onDetails,
  outOfStock = false,
}) => {
  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    if (typeof date === "string") {
      date = new Date(date);
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Card className="bg-white border-spa-sand">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-sm">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
            <Badge
              variant={outOfStock ? "destructive" : "outline"}
              className={
                outOfStock
                  ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                  : product.stockQuantity <= product.lowStockThreshold
                  ? "text-red-500 border-red-200 hover:bg-red-50"
                  : ""
              }
            >
              {outOfStock
                ? "Out of Stock"
                : product.stockQuantity <= product.lowStockThreshold
                ? `Low: ${product.stockQuantity}`
                : `In Stock: ${product.stockQuantity}`}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Cost:</span>{" "}
              <span className="font-medium">${product.costPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Price:</span>{" "}
              <span className="font-medium">${product.sellPrice.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Last Restocked:</span>{" "}
              <span className="font-medium">{formatDate(product.lastRestocked)}</span>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onDetails}
            >
              <Info className="h-4 w-4" />
              <span className="sr-only">Details</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onRestock}
            >
              <PackagePlus className="h-4 w-4" />
              <span className="sr-only">Restock</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
