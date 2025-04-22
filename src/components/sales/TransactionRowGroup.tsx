
import React from "react";

interface TransactionRowGroupProps {
  children: React.ReactNode;
  [key: string]: any; // This allows the component to accept any additional props
}

const TransactionRowGroup = ({ children, ...props }: TransactionRowGroupProps) => {
  return <>{children}</>;
};

export default TransactionRowGroup;
