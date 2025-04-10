
-- Update the insert_bulk_transactions function to properly handle UUID casting
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
      (transaction_record->>'product_id')::uuid,  -- Explicitly cast to UUID
      transaction_record->>'product_name',
      (transaction_record->>'quantity')::integer,
      (transaction_record->>'price')::numeric,
      transaction_record->>'type',
      COALESCE((transaction_record->>'date')::timestamp with time zone, now()),
      transaction_record->>'user_id',
      transaction_record->>'user_name',
      CASE 
        WHEN transaction_record->>'sale_id' IS NOT NULL 
        THEN (transaction_record->>'sale_id')::uuid 
        ELSE NULL 
      END
    )
    RETURNING id INTO inserted_id;
    
    results := array_append(results, (SELECT t FROM public.transactions t WHERE t.id = inserted_id));
  END LOOP;

  RETURN QUERY SELECT * FROM unnest(results);
END;
$$;
