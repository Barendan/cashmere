
import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import usePageTitle from "@/hooks/usePageTitle";
import { CartProvider } from "@/contexts/CartContext";
import ProductList from "@/components/sales/ProductList";
import SalesCart from "@/components/sales/SalesCart";
import TransactionsList from "@/components/sales/TransactionsList";

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, transactions } = useData();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  return (
    <CartProvider>
      <div className="w-full md:min-w-[90vw] xl:min-w-[90vw] flex flex-col min-h-[calc(100vh-4rem)] px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 h-[75vh]">
          <ProductList products={products} />
          <SalesCart isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
        </div>
        
        <TransactionsList transactions={transactions} />
      </div>
    </CartProvider>
  );
};

export default SalesLog;
