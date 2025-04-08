
-- Get all sales
CREATE OR REPLACE FUNCTION public.get_sales()
RETURNS SETOF public.sales
LANGUAGE sql
AS $$
  SELECT * FROM public.sales;
$$;

-- Insert a sale and return the inserted row
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
    notes
  ) VALUES (
    COALESCE((p_sale->>'date')::timestamp with time zone, now()),
    COALESCE((p_sale->>'total_amount')::numeric, 0),
    p_sale->>'user_id',
    p_sale->>'user_name',
    p_sale->>'payment_method',
    p_sale->>'notes'
  )
  RETURNING * INTO inserted_sale;

  RETURN QUERY SELECT * FROM public.sales WHERE id = inserted_sale.id;
END;
$$;

-- Insert a transaction with sale_id
CREATE OR REPLACE FUNCTION public.insert_transaction_with_sale(p_transaction jsonb)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_transaction public.transactions;
BEGIN
  INSERT INTO public.transactions (
    product_id,
    product_name,
    quantity,
    price,
    type,
    date,
    user_id,
    user_name,
    sale_id
  ) VALUES (
    p_transaction->>'product_id',
    p_transaction->>'product_name',
    (p_transaction->>'quantity')::integer,
    (p_transaction->>'price')::numeric,
    p_transaction->>'type',
    COALESCE((p_transaction->>'date')::timestamp with time zone, now()),
    p_transaction->>'user_id',
    p_transaction->>'user_name',
    (p_transaction->>'sale_id')::uuid
  )
  RETURNING * INTO inserted_transaction;

  RETURN QUERY SELECT * FROM public.transactions WHERE id = inserted_transaction.id;
END;
$$;

-- Insert bulk transactions
CREATE OR REPLACE FUNCTION public.insert_bulk_transactions(transactions jsonb[])
RETURNS SETOF public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_record jsonb;
  inserted_id uuid;
  results public.transactions[];
BEGIN
  FOREACH transaction_record IN ARRAY transactions
  LOOP
    INSERT INTO public.transactions (
      product_id,
      product_name,
      quantity,
      price,
      type,
      date,
      user_id,
      user_name,
      sale_id
    ) VALUES (
      transaction_record->>'product_id',
      transaction_record->>'product_name',
      (transaction_record->>'quantity')::integer,
      (transaction_record->>'price')::numeric,
      transaction_record->>'type',
      COALESCE((transaction_record->>'date')::timestamp with time zone, now()),
      transaction_record->>'user_id',
      transaction_record->>'user_name',
      (transaction_record->>'sale_id')::uuid
    )
    RETURNING id INTO inserted_id;
    
    results := array_append(results, (SELECT t FROM public.transactions t WHERE t.id = inserted_id));
  END LOOP;

  RETURN QUERY SELECT * FROM unnest(results);
END;
$$;
