
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
  amount: z.string().refine(value => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }, { message: "Must be a valid amount greater than 0" }),
  vendor: z.string().min(1, { message: "Vendor name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  date: z.date({ required_error: "Date is required" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EXPENSE_CATEGORIES = [
  "Supplies",
  "Equipment",
  "Marketing",
  "Rent",
  "Utilities",
  "Insurance",
  "Salaries",
  "Training",
  "Maintenance",
  "Other"
];

const ExpenseForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      vendor: "",
      category: "",
      date: new Date(),
      description: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      const amount = parseFloat(data.amount);
      
      const { error } = await supabase.from("finances").insert({
        type: "expense",
        amount,
        vendor: data.vendor,
        category: data.category,
        date: data.date.toISOString(),
        description: data.description || null,
      });

      if (error) throw error;

      toast({
        title: "Expense recorded",
        description: `$${amount.toFixed(2)} expense to ${data.vendor} recorded successfully`,
      });

      form.reset({
        amount: "",
        vendor: "",
        category: "",
        date: new Date(),
        description: "",
      });
    } catch (error) {
      console.error("Error recording expense:", error);
      toast({
        title: "Error recording expense",
        description: "Failed to record the expense. Please try again.",
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor/Supplier</FormLabel>
                <FormControl>
                  <Input placeholder="Enter vendor name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
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
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What was this expense for?"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add details like order numbers or specific items purchased.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Recording..." : "Record Expense"}
        </Button>
      </form>
    </Form>
  );
};

export default ExpenseForm;
