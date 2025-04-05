
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Service } from "@/models/types";

interface ServiceIncome {
  id: string;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  date: Date;
  paymentMethod: string;
  description?: string;
}

const IncomeList = () => {
  const [incomeRecords, setIncomeRecords] = useState<ServiceIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchIncomeRecords = async () => {
      try {
        const { data, error } = await supabase
          .from("finances")
          .select(`
            *,
            services:service_id (
              name,
              price
            )
          `)
          .eq("type", "income")
          .order("date", { ascending: false })
          .limit(20);

        if (error) throw error;

        const formattedData: ServiceIncome[] = data.map((record) => ({
          id: record.id,
          customerName: record.customer_name || "Unknown",
          serviceName: record.services?.name || "Unknown Service",
          servicePrice: record.amount || record.services?.price || 0,
          date: new Date(record.date),
          paymentMethod: record.payment_method || "Unknown",
          description: record.description,
        }));

        setIncomeRecords(formattedData);
      } catch (error) {
        console.error("Error fetching income records:", error);
        toast({
          title: "Error",
          description: "Failed to load income records",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncomeRecords();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (incomeRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No income records found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <h3 className="px-4 py-3 border-b font-medium">Recent Service Income</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{format(record.date, "PP")}</TableCell>
                <TableCell>{record.customerName}</TableCell>
                <TableCell>{record.serviceName}</TableCell>
                <TableCell className="capitalize">{record.paymentMethod}</TableCell>
                <TableCell className="text-right">${record.servicePrice.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default IncomeList;
