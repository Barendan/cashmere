-- Persist cash split amounts on product sales (mirrors finance_transactions.cash_amount)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS cash_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sales.cash_amount IS
  'Portion of total_amount paid in cash. For pure cash sales equals total_amount; for split payments 0 < cash_amount < total_amount.';

-- insert_sale: read/write cash_amount (jsonb signature from 20250406_add_sales_functions.sql)
CREATE OR REPLACE FUNCTION public.insert_sale(p_sale jsonb)
RETURNS SETOF public.sales
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_sale public.sales;
BEGIN
  INSERT INTO public.sales (
    date,
    total_amount,
    user_id,
    user_name,
    payment_method,
    notes,
    cash_amount
  ) VALUES (
    COALESCE((p_sale->>'date')::timestamp with time zone, now()),
    COALESCE((p_sale->>'total_amount')::numeric, 0),
    p_sale->>'user_id',
    p_sale->>'user_name',
    p_sale->>'payment_method',
    p_sale->>'notes',
    COALESCE((p_sale->>'cash_amount')::numeric, 0)
  )
  RETURNING * INTO inserted_sale;

  RETURN QUERY SELECT * FROM public.sales WHERE id = inserted_sale.id;
END;
$$;
