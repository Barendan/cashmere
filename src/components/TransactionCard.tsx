
import React from "react";
import { Transaction } from "../models/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TransactionCardProps {
  transaction: Transaction;
  getTransactionTypeColor: (type: string) => string;
  formatDate: (date: Date) => string;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  getTransactionTypeColor,
  formatDate,
}) => {
  return (
    <Card className="border-spa-sand">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <h3 className="font-medium text-sm">{transaction.productName}</h3>
              <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
            </div>
            <Badge className={getTransactionTypeColor(transaction.type)}>
              {transaction.type}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Quantity:</span>{" "}
              <span className="font-medium">{transaction.quantity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span>{" "}
              <span className="font-medium">${transaction.price.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">User:</span>{" "}
              <span className="font-medium">{transaction.userName}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionCard;
