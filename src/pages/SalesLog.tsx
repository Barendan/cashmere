
import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import usePageTitle from "@/hooks/usePageTitle";
import ItemList from "@/components/sales/ItemList";
import SalesCart from "@/components/sales/SalesCart";
import TransactionsList from "@/components/sales/TransactionsList";

const SalesLog = () => {
  usePageTitle("Sales Log");
  const { products, services, transactions, sales } = useData();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    console.log('[Sales Log] Data loaded:', {
      products: products.length,
      services: services.length,
      transactions: transactions.length,
      sales: sales.length
    });
  }, [products.length, services.length, transactions.length, sales.length]);
  
  return (
    <div className="w-full md:min-w-[90vw] xl:min-w-fit flex flex-col min-h-[calc(100vh-4rem)] px-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 h-[75vh]">
        <ItemList products={products} services={services} />
        <SalesCart 
          isProcessing={isProcessing} 
          setIsProcessing={setIsProcessing} 
        />
      </div>
      
      <TransactionsList transactions={transactions} sales={sales} />
    </div>
  );
};

export default SalesLog;
