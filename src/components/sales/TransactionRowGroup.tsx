
import React, { useState } from "react";
import { Transaction } from "@/models/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MinusCircle, PackageCheck } from "lucide-react";

interface TransactionRowGroupProps {
  transactions: Transaction[];
}

const TransactionRowGroup = ({ transactions }: TransactionRowGroupProps) => {
  // Group transactions by product
  const renderTransactionRows = () => {
    return transactions.map((transaction, index) => (
      <div 
        key={transaction.id} 
        className={`px-4 py-3 grid grid-cols-5 gap-2 text-sm ${
          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
        }`}
      >
        <div className="col-span-2 flex items-center gap-2">
          {transaction.type === 'sale' && (
            <MinusCircle className="h-4 w-4 text-red-500" />
          )}
          {transaction.type === 'restock' && (
            <PlusCircle className="h-4 w-4 text-green-500" />
          )}
          {transaction.type === 'adjustment' && (
            <MinusCircle className="h-4 w-4 text-amber-500" />
          )}
          
          <span className="font-medium">{transaction.productName}</span>
          
          <Badge 
            className={`ml-2 ${
              transaction.type === 'sale' 
                ? 'bg-blue-50 text-blue-600' 
                : transaction.type === 'restock'
                ? 'bg-green-50 text-green-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {transaction.type}
          </Badge>
        </div>
        
        <div className="text-center">{formatDate(transaction.date, true)}</div>
        
        <div className="text-center">
          {transaction.type === 'sale' ? '-' : '+'}{transaction.quantity}
        </div>
        
        <div className="text-right">
          {formatCurrency(transaction.price)}
        </div>
      </div>
    ));
  };

  return (
    <div className="border-t">
      {renderTransactionRows()}
    </div>
  );
};

export default TransactionRowGroup;
