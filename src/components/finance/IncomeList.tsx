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
import { Trash2, BadgePercent } from "lucide-react";
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
  servicesList?: Array<{ id: string, name: string, price: number, quantity?: number }>;
  discount?: number;
  originalTotal?: number;
  tipAmount?: number;
}

interface IncomeListProps {
  newIncome: any;
  limit?: number;
  compact?: boolean;
}

const IncomeList = ({ newIncome, limit = 20, compact = false }: IncomeListProps) => {
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
          .limit(limit);

        if (error) throw error;

        if (data) {
          const formattedData: ServiceIncome[] = data.map((record) => {
            const financeRecord = mapFinanceRowToFinanceRecord(record);
            
            let servicesList = undefined;
            let discount = 0;
            let originalTotal = 0;
            let tipAmount = 0;
            
            if (record.category) {
              try {
                const parsedCategory = JSON.parse(record.category);
                if (parsedCategory.serviceIds && Array.isArray(parsedCategory.serviceIds)) {
                  servicesList = parsedCategory.serviceNames.map((name: string, index: number) => ({
                    id: parsedCategory.serviceIds[index],
                    name,
                    price: parsedCategory.servicePrices[index],
                    quantity: parsedCategory.serviceQuantities ? parsedCategory.serviceQuantities[index] : 1
                  }));
                }
                
                if (parsedCategory.discount !== undefined) {
                  discount = parsedCategory.discount;
                }
                
                if (parsedCategory.originalTotal !== undefined) {
                  originalTotal = parsedCategory.originalTotal;
                }

                if (parsedCategory.tipAmount !== undefined) {
                  tipAmount = parsedCategory.tipAmount;
                }
              } catch (e) {
                console.error("Error parsing service details:", e);
              }
            }
            
            return {
              ...financeRecord,
              serviceName: record.services?.name || "Multiple Services",
              servicesList,
              discount,
              originalTotal,
              tipAmount
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
  }, [toast, limit]);

  useEffect(() => {
    if (newIncome) {
      const financeRecord = mapFinanceRowToFinanceRecord(newIncome);
      
      let servicesList = newIncome.servicesList;
      let discount = newIncome.discount || 0;
      let originalTotal = newIncome.originalTotal || 0;
      let tipAmount = newIncome.tipAmount || 0;
      
      if (!servicesList && newIncome.category) {
        try {
          const parsedCategory = JSON.parse(newIncome.category);
          if (parsedCategory.serviceIds && Array.isArray(parsedCategory.serviceIds)) {
            servicesList = parsedCategory.serviceNames.map((name: string, index: number) => ({
              id: parsedCategory.serviceIds[index],
              name,
              price: parsedCategory.servicePrices[index],
              quantity: parsedCategory.serviceQuantities ? parsedCategory.serviceQuantities[index] : 1
            }));
          }
          
          if (parsedCategory.discount !== undefined) {
            discount = parsedCategory.discount;
          }
          
          if (parsedCategory.originalTotal !== undefined) {
            originalTotal = parsedCategory.originalTotal;
          }

          if (parsedCategory.tipAmount !== undefined) {
            tipAmount = parsedCategory.tipAmount;
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
        servicesList,
        discount,
        originalTotal,
        tipAmount
      };
      
      setIncomeRecords(prev => [newIncomeRecord, ...prev].slice(0, limit));
    }
  }, [newIncome, limit]);

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    
    try {
      const { error } = await supabase
        .from('finances')
        .delete()
        .eq('id', incomeToDelete);
        
      if (error) throw error;
      
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
      const service = record.servicesList[0];
      const quantity = service.quantity || 1;
      return quantity > 1 ? `${service.name} × ${quantity}` : service.name;
    }
    
    const totalQuantity = record.servicesList.reduce((sum, service) => sum + (service.quantity || 1), 0);
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-left underline decoration-dotted">
            Multiple Services ({totalQuantity} items)
          </TooltipTrigger>
          <TooltipContent className="bg-white p-2 border rounded shadow-md max-w-xs">
            <div className="space-y-1 text-xs">
              {record.servicesList.map((service, idx) => {
                const quantity = service.quantity || 1;
                const lineTotal = service.price * quantity;
                return (
                  <div key={idx} className="flex justify-between gap-2">
                    <span>
                      {service.name}
                      {quantity > 1 && <span className="text-muted-foreground"> × {quantity}</span>}:
                    </span>
                    <span className="font-medium">${lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
              {record.discount > 0 && (
                <div className="flex justify-between gap-2 text-rose-600 pt-1 border-t">
                  <span>Discount:</span>
                  <span className="font-medium">-${record.discount.toFixed(2)}</span>
                </div>
              )}
              {record.tipAmount > 0 && (
                <div className="flex justify-between gap-2 text-emerald-600 pt-1 border-t">
                  <span>Tip:</span>
                  <span className="font-medium">+${record.tipAmount.toFixed(2)}</span>
                </div>
              )}
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

  const getAmountDisplay = (record: ServiceIncome) => {
    if (!record.discount || record.discount <= 0) {
      return (
        <div className="font-semibold text-emerald-600">${record.amount.toFixed(2)}</div>
      );
    }
    
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center text-sm text-gray-500 line-through">
          ${record.originalTotal?.toFixed(2) || "N/A"}
        </div>
        <div className="flex items-center font-semibold text-emerald-600">
          <BadgePercent className="h-3 w-3 mr-1" />
          ${record.amount.toFixed(2)}
        </div>
      </div>
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
      <div className="text-center py-6 border rounded-md bg-gray-50">
        <p className="text-gray-500">No income records found</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {incomeRecords.map((record) => (
          <div 
            key={record.id} 
            className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-emerald-200 transition-colors"
          >
            <div className="flex flex-col">
              <div className="font-medium text-gray-900">{formatServiceNames(record)}</div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>{format(record.date, "PP")}</span>
                <span>•</span>
                <span>{record.customerName || "Unknown customer"}</span>
                {record.discount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 flex items-center">
                      <BadgePercent className="h-3 w-3 mr-1" />
                      ${record.discount.toFixed(2)} off
                    </span>
                  </>
                )}
              </div>
            </div>
            {getAmountDisplay(record)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-spa-cream">
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
              <TableRow key={record.id} className="hover:bg-green-50">
                <TableCell>{format(record.date, "PP")}</TableCell>
                <TableCell>{record.customerName || "Unknown"}</TableCell>
                <TableCell>{formatServiceNames(record)}</TableCell>
                <TableCell className="capitalize">{record.paymentMethod || "Unknown"}</TableCell>
                <TableCell className="text-right">
                  {record.discount > 0 ? (
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-gray-500 line-through">${record.originalTotal?.toFixed(2)}</div>
                      <div className="font-medium text-emerald-600 flex items-center">
                        <BadgePercent className="h-3 w-3 mr-1" />
                        ${record.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-rose-600">-${record.discount.toFixed(2)}</div>
                    </div>
                  ) : (
                    <span className="font-medium text-emerald-600">${record.amount.toFixed(2)}</span>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openDeleteDialog(record.id)}
                      className="hover:bg-rose-100 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
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
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomeList;
