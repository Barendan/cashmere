
-- Create get_sales function if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_sales()
RETURNS SETOF sales AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.sales ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Make sure the insert_sale function exists
CREATE OR REPLACE FUNCTION public.insert_sale(p_sale json)
RETURNS SETOF sales AS $$
DECLARE
  v_sale sales;
BEGIN
  INSERT INTO public.sales (
    date, 
    total_amount, 
    user_id, 
    user_name, 
    payment_method,
    notes
  )
  VALUES (
    COALESCE((p_sale->>'date')::timestamp with time zone, now()),
    COALESCE((p_sale->>'total_amount')::numeric, 0),
    p_sale->>'user_id',
    p_sale->>'user_name',
    p_sale->>'payment_method',
    p_sale->>'notes'
  )
  RETURNING * INTO v_sale;
  
  RETURN NEXT v_sale;
END;
$$ LANGUAGE plpgsql;

-- Make sure the insert_transaction_with_sale function exists
CREATE OR REPLACE FUNCTION public.insert_transaction_with_sale(p_transaction json)
RETURNS SETOF transactions AS $$
DECLARE
  v_transaction transactions;
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
  )
  VALUES (
    p_transaction->>'product_id',
    p_transaction->>'product_name',
    COALESCE((p_transaction->>'quantity')::integer, 0),
    COALESCE((p_transaction->>'price')::numeric, 0),
    p_transaction->>'type',
    COALESCE((p_transaction->>'date')::timestamp with time zone, now()),
    p_transaction->>'user_id',
    p_transaction->>'user_name',
    p_transaction->>'sale_id'
  )
  RETURNING * INTO v_transaction;
  
  RETURN NEXT v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Make sure the insert_bulk_transactions function exists
CREATE OR REPLACE FUNCTION public.insert_bulk_transactions(transactions json[])
RETURNS SETOF public.transactions AS $$
DECLARE
  transaction json;
  rec public.transactions;
BEGIN
  FOREACH transaction IN ARRAY transactions LOOP
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
      transaction->>'product_id',
      transaction->>'product_name',
      COALESCE((transaction->>'quantity')::integer, 0),
      COALESCE((transaction->>'price')::numeric, 0),
      transaction->>'type',
      COALESCE((transaction->>'date')::timestamp with time zone, now()),
      transaction->>'user_id',
      transaction->>'user_name',
      transaction->>'sale_id'
    )
    RETURNING * INTO rec;
    
    RETURN NEXT rec;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
