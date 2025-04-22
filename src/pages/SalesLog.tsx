
import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import usePageTitle from "@/hooks/usePageTitle";
import { CartProvider } from "@/contexts/CartContext";
import ProductList from "@/components/sales/ProductList";
import SalesCart from "@/components/sales/SalesCart";
import TransactionsList from "@/components/sales/TransactionsList";
import RestockDetailDialog from "@/components/sales/RestockDetailDialog";
import { Transaction } from "@/models/types";

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, transactions } = useData();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isRestockDetailOpen, setIsRestockDetailOpen] = useState<boolean>(false);
  
  const handleViewRestockDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsRestockDetailOpen(true);
  };
  
  return (
    <CartProvider>
      <div className="w-full md:min-w-[90vw] xl:min-w-[90vw] flex flex-col min-h-[calc(100vh-4rem)] px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 h-[65vh]">
          <ProductList products={products} />
          <SalesCart isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
        </div>
        
        <TransactionsList 
          transactions={transactions} 
          onViewRestockDetails={handleViewRestockDetails}
        />
        
        <RestockDetailDialog 
          isOpen={isRestockDetailOpen} 
          onClose={() => setIsRestockDetailOpen(false)} 
          transaction={selectedTransaction}
        />
      </div>
    </CartProvider>
  );
};

export default SalesLog;
