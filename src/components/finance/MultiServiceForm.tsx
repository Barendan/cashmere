import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, BadgePercent } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [dateOpen, setDateOpen] = useState(false);
  const [localDiscount, setLocalDiscount] = useState('0');
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
      const servicesTotal = data.services.reduce(
        (sum, service) => sum + service.price,
        0
      );
      const discountAmount = data.discount || 0;
      const totalAmount = Math.max(0, servicesTotal - discountAmount);

      const serviceDetails = {
        serviceIds: data.services.map((service) => service.id),
        serviceNames: data.services.map((service) => service.name),
        servicePrices: data.services.map((service) => service.price),
        discount: discountAmount,
        originalTotal: servicesTotal
      };

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

      form.reset({
        date: new Date(),
        customerName: "",
        services: [],
        paymentMethod: "",
        description: "",
        discount: 0,
      });

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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {/* Customer details at the top in the middle */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
  
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
                        onSelect={ (date) => {
                          field.onChange(date);
                          setDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    key={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
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
                        step="1"
                        placeholder="0.00"
                        className="pl-10"
                        value={localDiscount}
                        {...field}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setLocalDiscount(inputValue);
                          field.onChange(inputValue === '' ? 0 : parseFloat(inputValue));
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
  
          <div className="mt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add any additional notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

        </div>
        <hr/>
  
        {/* Two columns below for services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          {/* Left column: Available Services */}
          <div className="flex flex-col">
            <FormLabel className="mb-2">Available Services</FormLabel>
            <div className="border rounded-md flex-grow h-[400px]">
              <ScrollArea className="h-full">
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
  
          {/* Right column: Selected Services */}
          <div className="flex flex-col">
            <FormLabel className="mb-2">Selected Services</FormLabel>
            <div className="border rounded-md h-[400px] flex flex-col">
              <ScrollArea className="flex-grow h-full">
                {fields.length > 0 ? (
                  <div className="space-y-2 p-3">
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
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-6 text-sm text-muted-foreground">
                    No services selected
                  </div>
                )}
              </ScrollArea>
              {fields.length > 0 && (
                <div className="flex flex-col pt-2 border-t mt-auto p-3 space-y-1 flex-shrink-0">
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
              )}
            </div>
            {form.formState.errors.services && (
              <div className="text-sm font-medium text-destructive">
                {form.formState.errors.services.message}
              </div>
            )}
          </div>
        </div>
  
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full max-w-3xl mx-auto mt-2"
        >
          {isSubmitting ? "Recording..." : "Record Income"}
        </Button>
      </form>
    </Form>
  );
};

export default MultiServiceForm;
