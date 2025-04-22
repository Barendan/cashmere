import React, { useState } from "react";
import { Transaction } from "@/models/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

interface TransactionRowGroupProps {
  children: React.ReactNode;
  hasDetails?: boolean;
  detailsExpanded?: boolean;
  onToggleDetails?: () => void;
  childTransactions?: Transaction[];
  [key: string]: any;
}

const TransactionRowGroup = ({ 
  children, 
  hasDetails = false,
  detailsExpanded = false,
  onToggleDetails,
  childTransactions = [],
  ...props 
}: TransactionRowGroupProps) => {
  return (
    <>
      {children}
      {hasDetails && detailsExpanded && childTransactions.length > 0 && (
        <>
          {childTransactions.map(transaction => (
            <TableRow key={transaction.id} className="bg-white border-t border-dashed border-gray-200">
              <TableCell></TableCell>
              <TableCell className="py-2 pl-8">
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                  {transaction.productName}
                </div>
              </TableCell>
              <TableCell></TableCell>
              <TableCell>
                {transaction.quantity} × {formatCurrency(transaction.price / transaction.quantity)}
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">
                {formatCurrency(transaction.price)}
              </TableCell>
            </TableRow>
          ))}
        </>
      )}
    </>
  );
};

export default TransactionRowGroup;
