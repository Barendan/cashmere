
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, ChevronsUpDown, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Service } from "@/models/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Define the form schema
const serviceFormSchema = z.object({
  date: z.date({
    required_error: "A date is required",
  }),
  customerName: z.string().min(1, "Customer name is required"),
  services: z
    .array(
      z.object({
        id: z.string().min(1, "Service is required"),
        name: z.string(),
        price: z.number(),
      })
    )
    .min(1, "At least one service is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  description: z.string().optional(),
  discount: z.coerce.number().default(0),
});

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "debit", label: "Debit Card" },
  { value: "zelle", label: "Zelle" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

const MultiServiceForm = ({ onIncomeAdded }) => {
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      date: new Date(),
      customerName: "",
      services: [],
      paymentMethod: "",
      description: "",
      discount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        if (data) {
          setAvailableServices(
            data.map((service) => ({
              id: service.id,
              name: service.name,
              description: service.description || "",
              price: service.price,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        toast({
          title: "Error",
          description: "Failed to load services",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [toast]);

  const addService = (service: Service) => {
    // Check if service is already added
    const isAlreadyAdded = form.getValues().services.some(
      (s) => s.id === service.id
    );

    if (!isAlreadyAdded) {
      append({
        id: service.id,
        name: service.name,
        price: service.price,
      });
    } else {
      toast({
        title: "Service already added",
        description: `${service.name} is already in the list`,
      });
    }
  };

  const calculateTotal = () => {
    const serviceTotal = form
      .getValues()
      .services.reduce((total, service) => total + service.price, 0);
    
    const discount = form.getValues().discount || 0;
    return Math.max(0, serviceTotal - discount);
  };

  const calculateDiscount = () => {
    return form.getValues().discount || 0;
  };

  const onSubmit = async (data: z.infer<typeof serviceFormSchema>) => {
    setIsSubmitting(true);

    try {
      // Calculate the total amount after discount
      const servicesTotal = data.services.reduce(
        (sum, service) => sum + service.price,
        0
      );
      const discountAmount = data.discount || 0;
      const totalAmount = Math.max(0, servicesTotal - discountAmount);

      // Prepare service details for storing in the category field
      const serviceDetails = {
        serviceIds: data.services.map((service) => service.id),
        serviceNames: data.services.map((service) => service.name),
        servicePrices: data.services.map((service) => service.price),
        discount: discountAmount,
        originalTotal: servicesTotal
      };

      // Format the data for insertion
      const incomeData = {
        type: "income",
        date: data.date.toISOString(),
        amount: totalAmount,
        customer_name: data.customerName,
        description: data.description || null,
        payment_method: data.paymentMethod,
        service_id: data.services.length === 1 ? data.services[0].id : null,
        category: JSON.stringify(serviceDetails),
      };

      // Insert the income record
      const { data: newIncome, error } = await supabase
        .from("finances")
        .insert(incomeData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service income recorded successfully",
      });

      // Reset the form
      form.reset({
        date: new Date(),
        customerName: "",
        services: [],
        paymentMethod: "",
        description: "",
        discount: 0,
      });

      // Pass the new income to the parent component along with the service details
      if (onIncomeAdded) {
        const incomeWithServices = {
          ...newIncome,
          servicesList: data.services.map(service => ({
            id: service.id,
            name: service.name,
            price: service.price
          })),
          discount: discountAmount,
          originalTotal: servicesTotal
        };
        onIncomeAdded(incomeWithServices);
      }
    } catch (error) {
      console.error("Error recording service income:", error);
      toast({
        title: "Error",
        description: "Failed to record service income",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Income</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Date Field */}
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
                          variant="outline"
                          className={cn(
                            "w-full h-10 pl-3 text-left font-normal",
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Name Field */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter customer name"
                      {...field}
                      autoComplete="name"
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method Field */}
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
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount Field */}
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount ($)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <BadgePercent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10 h-10"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '0' : e.target.value;
                          field.onChange(parseFloat(value));
                        }}
                        value={field.value.toString()}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Services Section */}
            <div className="md:col-span-2 space-y-4">
              <FormLabel>Services</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selected Services */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Selected Services</div>
                  <div className="border rounded-md p-4 min-h-[100px]">
                    {fields.length > 0 ? (
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between bg-accent/50 rounded-md p-2"
                          >
                            <div>
                              <span className="font-medium">
                                {field.name}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                ${field.price.toFixed(2)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-col pt-2 border-t mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Subtotal:</span>
                            <span className="text-sm">
                              ${fields.reduce((sum, field) => sum + field.price, 0).toFixed(2)}
                            </span>
                          </div>
                          {calculateDiscount() > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span className="text-sm">Discount:</span>
                              <span className="text-sm">-${calculateDiscount().toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t mt-1">
                            <span className="font-medium">Total:</span>
                            <span className="font-bold">
                              ${calculateTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No services selected
                      </div>
                    )}
                  </div>
                  {form.formState.errors.services && (
                    <div className="text-sm font-medium text-destructive">
                      {form.formState.errors.services.message}
                    </div>
                  )}
                </div>

                {/* Available Services */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Available Services</div>
                  <div className="border rounded-md">
                    <ScrollArea className="h-[200px]">
                      {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading services...
                        </div>
                      ) : availableServices.length > 0 ? (
                        <div className="p-2 grid grid-cols-1 gap-2">
                          {availableServices.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between border rounded-md p-2 hover:bg-accent/50 cursor-pointer"
                              onClick={() => addService(service)}
                            >
                              <div>
                                <span className="font-medium">
                                  {service.name}
                                </span>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">
                                  ${service.price.toFixed(2)}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No services available
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add any additional notes"
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:col-span-2 mt-2"
            >
              {isSubmitting ? "Recording..." : "Record Income"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MultiServiceForm;
