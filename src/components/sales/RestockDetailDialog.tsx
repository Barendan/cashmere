
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction } from "@/models/types";
import { useData } from "@/contexts/DataContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isParentRestockTransaction } from "@/config/systemProducts";

interface RestockDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const RestockDetailDialog = ({ isOpen, onClose, transaction }: RestockDetailDialogProps) => {
  const { getRestockDetails } = useData();
  const [restockItems, setRestockItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRestockDetails = async () => {
      if (transaction && isParentRestockTransaction(transaction)) {
        setLoading(true);
        try {
          const details = await getRestockDetails(transaction.id);
          setRestockItems(details);
        } catch (error) {
          console.error("Error loading restock details:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (isOpen && transaction) {
      loadRestockDetails();
    } else {
      setRestockItems([]);
    }
  }, [isOpen, transaction, getRestockDetails]);

  if (!transaction) return null;

  const totalRestockCost = transaction.price;
  const totalItems = restockItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPotentialRevenue = restockItems.reduce((sum, item) => {
    const product = item.productName;
    // Estimate potential revenue based on quantity restocked
    // This is a simplified calculation - we would ideally get the actual sell price
    // For now, we'll use a 100% markup as an example
    return sum + (item.price * 2); // Assuming 100% markup
  }, 0);
  const potentialProfit = totalPotentialRevenue - totalRestockCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            Restock Details - {formatDate(transaction.date)}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-md border border-green-100">
              <div className="text-sm text-green-600 font-medium">Total Cost</div>
              <div className="text-xl font-bold">{formatCurrency(totalRestockCost)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {restockItems.length} products, {totalItems} items
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <div className="text-sm text-blue-600 font-medium">Potential Revenue</div>
              <div className="text-xl font-bold">{formatCurrency(totalPotentialRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on selling all items
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-md border border-purple-100">
              <div className="text-sm text-purple-600 font-medium">Potential Profit</div>
              <div className="text-xl font-bold">{formatCurrency(potentialProfit)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalRestockCost > 0 ? `${((potentialProfit / totalRestockCost) * 100).toFixed(1)}% margin` : '0% margin'}
              </div>
            </div>
          </div>

          <div className="border rounded-md">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading restock details...
                      </TableCell>
                    </TableRow>
                  ) : restockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No items found in this restock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    restockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price / item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Restock performed by: {transaction.userName}</p>
            <p>Transaction ID: {transaction.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestockDetailDialog;
