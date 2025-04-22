
import React from "react";
import { Product } from "@/models/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ArrowUp, ArrowDown } from "lucide-react";
import { SortState } from "./useSortableTable";

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  sortState: SortState;
  onSort: (column: string) => void;
}

const columns = [
  { key: "name", label: "Product" },
  { key: "category", label: "Category" },
  { key: "stockQuantity", label: "Stock", className: "text-right" },
  { key: "costPrice", label: "Cost", className: "text-right" },
  { key: "sellPrice", label: "Price", className: "text-right" },
];

export default function InventoryTable({
  products,
  onEdit,
  sortState,
  onSort,
}: InventoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-white">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={`cursor-pointer select-none group ${col.className || ""}`}
              onClick={() => onSort(col.key)}
              style={{ userSelect: "none" }}
              tabIndex={0}
              aria-label={`Sort by ${col.label}`}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSort(col.key); }}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {sortState.column === col.key && sortState.direction && (
                  sortState.direction === "asc"
                    ? <ArrowUp className="h-4 w-4 text-blue-600" aria-label="Sorted ascending" />
                    : <ArrowDown className="h-4 w-4 text-blue-600" aria-label="Sorted descending" />
                )}
              </span>
            </TableHead>
          ))}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? (
          products.map((product, index) => (
            <TableRow
              key={product.id}
              className={
                product.stockQuantity === 0 
                  ? "bg-red-50 hover:bg-red-100" 
                  : index % 2 === 0 
                    ? "bg-white hover:bg-gray-100" 
                    : "bg-gray-50 hover:bg-gray-100"
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
              <TableCell className="text-right">{product.stockQuantity}</TableCell>
              <TableCell className="text-right">${product.costPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right">${product.sellPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-100 transition"
                    onClick={() => onEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length + 1} className="text-center py-6 text-muted-foreground">
              No products have been added yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

