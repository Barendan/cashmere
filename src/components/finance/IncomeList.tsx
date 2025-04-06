
import React, { useState, useEffect } from "react";
import { supabase, mapFinanceRowToFinanceRecord } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceRecord, Service } from "@/models/types";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceIncome extends FinanceRecord {
  serviceName: string;
  servicesList?: Array<{ id: string, name: string, price: number }>;
}

const IncomeList = ({ newIncome }) => {
  const [incomeRecords, setIncomeRecords] = useState<ServiceIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

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

        if (data) {
          const formattedData: ServiceIncome[] = data.map((record) => {
            const financeRecord = mapFinanceRowToFinanceRecord(record);
            
            // Check if this record has multiple services stored in the category field
            let servicesList = undefined;
            if (record.category) {
              try {
                const parsedCategory = JSON.parse(record.category);
                if (parsedCategory.serviceIds && Array.isArray(parsedCategory.serviceIds)) {
                  servicesList = parsedCategory.serviceNames.map((name: string, index: number) => ({
                    id: parsedCategory.serviceIds[index],
                    name,
                    price: parsedCategory.servicePrices[index]
                  }));
                }
              } catch (e) {
                console.error("Error parsing service details:", e);
              }
            }
            
            return {
              ...financeRecord,
              serviceName: record.services?.name || "Multiple Services",
              servicesList
            };
          });

          setIncomeRecords(formattedData);
        }
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

  // When a new income record is added, update the list
  useEffect(() => {
    if (newIncome) {
      const financeRecord = mapFinanceRowToFinanceRecord(newIncome);
      
      // Check if the new income has multiple services
      let servicesList = newIncome.servicesList;
      
      // If no servicesList is provided directly but category has the data
      if (!servicesList && newIncome.category) {
        try {
          const parsedCategory = JSON.parse(newIncome.category);
          if (parsedCategory.serviceIds && Array.isArray(parsedCategory.serviceIds)) {
            servicesList = parsedCategory.serviceNames.map((name: string, index: number) => ({
              id: parsedCategory.serviceIds[index],
              name,
              price: parsedCategory.servicePrices[index]
            }));
          }
        } catch (e) {
          console.error("Error parsing service details for new income:", e);
        }
      }
      
      const newIncomeRecord: ServiceIncome = {
        ...financeRecord,
        serviceName: servicesList && servicesList.length > 1 
          ? "Multiple Services" 
          : newIncome.services?.name || "Unknown Service",
        servicesList
      };
      
      setIncomeRecords(prev => [newIncomeRecord, ...prev]);
    }
  }, [newIncome]);

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    
    try {
      const { error } = await supabase
        .from('finances')
        .delete()
        .eq('id', incomeToDelete);
        
      if (error) throw error;
      
      // Remove the deleted record from the state
      setIncomeRecords(prev => prev.filter(record => record.id !== incomeToDelete));
      
      toast({
        title: "Success",
        description: "Income record deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting income record:", error);
      toast({
        title: "Error",
        description: "Failed to delete income record",
        variant: "destructive",
      });
    } finally {
      setIncomeToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setIncomeToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const formatServiceNames = (record: ServiceIncome) => {
    if (!record.servicesList || record.servicesList.length === 0) {
      return record.serviceName;
    }
    
    if (record.servicesList.length === 1) {
      return record.servicesList[0].name;
    }
    
    // For multiple services
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-left underline decoration-dotted">
            Multiple Services ({record.servicesList.length})
          </TooltipTrigger>
          <TooltipContent className="bg-white p-2 border rounded shadow-md max-w-xs">
            <div className="space-y-1 text-xs">
              {record.servicesList.map((service, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span>{service.name}:</span>
                  <span className="font-medium">${service.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                <span>Total:</span>
                <span>${record.amount.toFixed(2)}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
              {isAdmin && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{format(record.date, "PP")}</TableCell>
                <TableCell>{record.customerName || "Unknown"}</TableCell>
                <TableCell>{formatServiceNames(record)}</TableCell>
                <TableCell className="capitalize">{record.paymentMethod || "Unknown"}</TableCell>
                <TableCell className="text-right">${record.amount.toFixed(2)}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openDeleteDialog(record.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomeList;
