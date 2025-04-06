
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase, mapServiceRowToService } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIcon, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Service } from "@/models/types";
import { formatCurrency } from "@/lib/format";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const formSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required" }),
  date: z.date({ required_error: "Date is required" }),
  paymentMethod: z.string().min(1, { message: "Payment method is required" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SelectedService {
  id: string;
  name: string;
  price: number;
}

const MultiServiceForm = ({ onIncomeAdded }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      date: new Date(),
      paymentMethod: "cash",
      description: "",
    },
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*");
          
        if (error) throw error;
        
        if (data) {
          setServices(data.map(service => mapServiceRowToService(service)));
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        toast({
          title: "Error fetching services",
          description: "Unable to load services. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchServices();
  }, [toast]);

  const getTotalAmount = () => {
    return selectedServices.reduce((total, service) => total + service.price, 0);
  };

  const handleAddService = () => {
    if (!currentServiceId) return;
    
    const serviceToAdd = services.find(s => s.id === currentServiceId);
    if (!serviceToAdd) return;
    
    // Check if service is already added
    if (selectedServices.some(s => s.id === currentServiceId)) {
      toast({
        title: "Service already added",
        description: "This service is already in the order",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedServices([...selectedServices, {
      id: serviceToAdd.id,
      name: serviceToAdd.name,
      price: serviceToAdd.price
    }]);
    
    setCurrentServiceId("");
  };
  
  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };

  const onSubmit = async (data: FormValues) => {
    if (selectedServices.length === 0) {
      toast({
        title: "No services selected",
        description: "Please add at least one service to the order",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a single income record with the total amount
      const totalAmount = getTotalAmount();
      const serviceNames = selectedServices.map(s => s.name).join(", ");
      
      // Store the service IDs as an array in the description (for reference)
      const serviceIds = selectedServices.map(s => s.id);
      const serviceDetails = JSON.stringify({
        serviceIds,
        serviceNames: selectedServices.map(s => s.name),
        servicePrices: selectedServices.map(s => s.price)
      });
      
      // Add additional note if provided
      const descriptionText = data.description 
        ? `${serviceNames}\n\nServices: ${serviceNames}\n\nNote: ${data.description}` 
        : `Services: ${serviceNames}`;
      
      const { data: newIncome, error } = await supabase
        .from("finances")
        .insert({
          type: "income",
          customer_name: data.customerName,
          // Use the first service as the main service_id for filtering purposes
          service_id: serviceIds[0],
          date: data.date.toISOString(),
          amount: totalAmount,
          payment_method: data.paymentMethod,
          description: descriptionText,
          // Store the full service details in the category field for now
          category: serviceDetails
        })
        .select('*, services:service_id(name, price)');

      if (error) throw error;

      toast({
        title: "Income recorded",
        description: `Services for ${data.customerName} recorded successfully`,
      });

      // Call the callback with the new consolidated income record
      if (newIncome && newIncome.length > 0) {
        // Add the list of services to the record for display
        const incomeRecord = {
          ...newIncome[0],
          servicesList: selectedServices
        };
        onIncomeAdded(incomeRecord);
      }

      // Reset form
      form.reset({
        customerName: "",
        date: new Date(),
        paymentMethod: "cash",
        description: "",
      });
      
      setSelectedServices([]);
      
    } catch (error) {
      console.error("Error recording income:", error);
      toast({
        title: "Error recording income",
        description: "Failed to record the service income. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="debit">Debit Card</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Service Selection */}
          <div>
            <FormLabel>Add Services</FormLabel>
            <div className="flex gap-2">
              <Select value={currentServiceId} onValueChange={setCurrentServiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ${service.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                size="icon" 
                onClick={handleAddService}
                disabled={!currentServiceId}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Services List */}
        <div>
          <h3 className="text-sm font-medium mb-2">Selected Services:</h3>
          {selectedServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services selected</p>
          ) : (
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <Card key={service.id} className="bg-muted/30">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm">{formatCurrency(service.price)}</p>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0" 
                      onClick={() => handleRemoveService(service.id)}
                    >
                      <X size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              <div className="mt-4 py-2 px-3 bg-muted rounded-md">
                <div className="flex justify-between">
                  <p className="font-medium">Total:</p>
                  <p className="font-bold">{formatCurrency(getTotalAmount())}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any special notes about the service"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add any special requests or modifications to the standard service.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || selectedServices.length === 0}>
          {isLoading ? "Recording..." : "Record Service Income"}
        </Button>
      </form>
    </Form>
  );
};

export default MultiServiceForm;
