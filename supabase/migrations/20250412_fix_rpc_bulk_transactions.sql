
-- Update the insert_bulk_transactions function to properly handle UUIDs from jsonb
CREATE OR REPLACE FUNCTION public.insert_bulk_transactions(transactions jsonb[])
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
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
      (transaction_record->>'product_id')::uuid,  -- Explicit cast to UUID
      transaction_record->>'product_name',
      (transaction_record->>'quantity')::integer,
      (transaction_record->>'price')::numeric,
      transaction_record->>'type',
      COALESCE((transaction_record->>'date')::timestamp with time zone, now()),
      transaction_record->>'user_id',
      transaction_record->>'user_name',
      CASE 
        WHEN transaction_record->>'sale_id' IS NOT NULL AND transaction_record->>'sale_id' != 'null'
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

-- Ensure RLS is properly set up for transactions table
DO $$
BEGIN
  -- Check if RLS is enabled on the transactions table
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND rowsecurity = true
  ) THEN
    -- Enable RLS if it's not already enabled
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Make sure the insert_bulk_transactions function has the necessary permissions
GRANT EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) TO anon;
