
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase, mapServiceRowToService } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Service } from "@/models/types";
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

const formSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required" }),
  serviceId: z.string().min(1, { message: "Service is required" }),
  date: z.date({ required_error: "Date is required" }),
  paymentMethod: z.string().min(1, { message: "Payment method is required" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const IncomeForm = ({ onIncomeAdded }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      serviceId: "",
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

  const onSubmit = async (data: FormValues) => {
    if (!selectedService) {
      toast({
        title: "Error",
        description: "Please select a service",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: newIncome, error } = await supabase
        .from("finances")
        .insert({
          type: "income",
          customer_name: data.customerName,
          service_id: data.serviceId,
          date: data.date.toISOString(),
          amount: selectedService.price,
          payment_method: data.paymentMethod,
          description: data.description || null,
        })
        .select('*, services:service_id(name, price)');

      if (error) throw error;

      toast({
        title: "Income recorded",
        description: `Service for ${data.customerName} recorded successfully`,
      });

      // Call the callback with the new income record
      if (newIncome && newIncome.length > 0) {
        onIncomeAdded(newIncome[0]);
      }

      form.reset({
        customerName: "",
        serviceId: "",
        date: new Date(),
        paymentMethod: "cash",
        description: "",
      });
      
      setSelectedService(null);
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

  // Handle service selection to update selectedService
  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setSelectedService(service || null);
    form.setValue("serviceId", serviceId);
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
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select
                  onValueChange={handleServiceChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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

        {selectedService && (
          <div className="py-2 px-4 bg-muted rounded-md">
            <p className="font-medium">Service price: ${selectedService.price.toFixed(2)}</p>
          </div>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Recording..." : "Record Service Income"}
        </Button>
      </form>
    </Form>
  );
};

export default IncomeForm;
