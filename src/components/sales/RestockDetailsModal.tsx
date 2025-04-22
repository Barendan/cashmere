
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction } from "@/models/types";

interface RestockDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTransaction: Transaction | null;
  childTransactions: Transaction[];
}

const RestockDetailsModal: React.FC<RestockDetailsModalProps> = ({
  open,
  onOpenChange,
  parentTransaction,
  childTransactions,
}) => {
  if (!parentTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Restock Details</DialogTitle>
          <DialogDescription>
            View details for this restock transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <div>
              <div className="font-medium">Restocked By</div>
              <div>{parentTransaction.userName}</div>
            </div>
            <div>
              <div className="font-medium">Date</div>
              <div>{formatDate(parentTransaction.date)}</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">Restocked Items</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No details available.
                    </TableCell>
                  </TableRow>
                ) : (
                  childTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.productName}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogClose asChild>
          <button className="mt-4 px-4 py-2 rounded bg-spa-sand hover:bg-spa-sand/80 text-sm font-medium">Close</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default RestockDetailsModal;
