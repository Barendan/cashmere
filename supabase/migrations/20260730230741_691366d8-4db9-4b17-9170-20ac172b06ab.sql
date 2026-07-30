-- 1. Drop role-agnostic catch-all SELECT policies (role-scoped ones remain)
DROP POLICY IF EXISTS "Allow authenticated users to select products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to select transactions" ON public.transactions;

-- 2. Server-side identity enforcement in write RPCs
CREATE OR REPLACE FUNCTION public.insert_sale(p_sale jsonb)
 RETURNS SETOF sales
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted_sale public.sales;
  v_total_amount numeric;
  v_payment_method text;
  v_cash_amount numeric;
  v_uid uuid := auth.uid();
  v_user_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(name, email) INTO v_user_name FROM public.profiles WHERE id = v_uid;
  v_user_name := COALESCE(v_user_name, nullif(trim(p_sale->>'user_name'), ''), 'Unknown User');

  v_total_amount := COALESCE((p_sale->>'total_amount')::numeric, 0);
  v_payment_method := nullif(trim(p_sale->>'payment_method'), '');

  IF lower(coalesce(v_payment_method, '')) = 'cash' THEN
    v_cash_amount := v_total_amount;
  ELSE
    v_cash_amount := COALESCE((p_sale->>'cash_amount')::numeric, 0);
  END IF;

  IF v_cash_amount < 0 THEN
    RAISE EXCEPTION 'cash_amount cannot be negative';
  END IF;

  IF v_cash_amount > v_total_amount THEN
    RAISE EXCEPTION 'cash_amount cannot exceed total_amount';
  END IF;

  IF lower(coalesce(v_payment_method, '')) <> 'cash'
     AND v_total_amount > 0
     AND v_cash_amount > 0
     AND v_cash_amount >= v_total_amount THEN
    RAISE EXCEPTION 'cash_amount must be less than total_amount for split payments';
  END IF;

  INSERT INTO public.sales (
    date, total_amount, user_id, user_name, payment_method, notes, cash_amount
  ) VALUES (
    COALESCE((p_sale->>'date')::timestamp with time zone, now()),
    v_total_amount,
    v_uid::text,
    v_user_name,
    v_payment_method,
    p_sale->>'notes',
    v_cash_amount
  )
  RETURNING * INTO inserted_sale;

  RETURN QUERY SELECT * FROM public.sales WHERE id = inserted_sale.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_transaction_with_sale(p_transaction jsonb)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id uuid;
  inserted_transaction transactions;
  v_uid uuid := auth.uid();
  v_user_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(name, email) INTO v_user_name FROM public.profiles WHERE id = v_uid;
  v_user_name := COALESCE(v_user_name, nullif(trim(p_transaction->>'user_name'), ''), 'Unknown User');

  INSERT INTO transactions (
    product_id, product_name, quantity, price, type, date,
    user_id, user_name, sale_id, parent_transaction_id
  ) VALUES (
    (p_transaction->>'product_id')::uuid,
    p_transaction->>'product_name',
    COALESCE((p_transaction->>'quantity')::integer, 0),
    COALESCE((p_transaction->>'price')::numeric, 0),
    p_transaction->>'type',
    COALESCE((p_transaction->>'date')::timestamp with time zone, now()),
    v_uid::text,
    v_user_name,
    CASE WHEN p_transaction->>'sale_id' IS NOT NULL THEN (p_transaction->>'sale_id')::uuid ELSE NULL END,
    CASE WHEN p_transaction->>'parent_transaction_id' IS NOT NULL THEN (p_transaction->>'parent_transaction_id')::uuid ELSE NULL END
  )
  RETURNING id INTO new_transaction_id;

  SELECT * INTO inserted_transaction FROM transactions WHERE id = new_transaction_id;
  RETURN NEXT inserted_transaction;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_bulk_transactions(transactions jsonb[])
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record jsonb;
  inserted_id uuid;
  results public.transactions[];
  v_uid uuid := auth.uid();
  v_user_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(name, email) INTO v_user_name FROM public.profiles WHERE id = v_uid;

  FOREACH transaction_record IN ARRAY transactions
  LOOP
    INSERT INTO public.transactions (
      product_id, product_name, quantity, price, type, date,
      user_id, user_name, sale_id, parent_transaction_id
    ) VALUES (
      CASE WHEN transaction_record->>'product_id' IS NULL THEN NULL
           ELSE (transaction_record->>'product_id')::uuid END,
      transaction_record->>'product_name',
      COALESCE((transaction_record->>'quantity')::integer, 0),
      COALESCE((transaction_record->>'price')::numeric, 0),
      transaction_record->>'type',
      COALESCE((transaction_record->>'date')::timestamp with time zone, now()),
      v_uid::text,
      COALESCE(v_user_name, nullif(trim(transaction_record->>'user_name'), ''), 'Unknown User'),
      CASE WHEN transaction_record->>'sale_id' IS NULL OR transaction_record->>'sale_id' = '' OR transaction_record->>'sale_id' = 'null'
           THEN NULL ELSE (transaction_record->>'sale_id')::uuid END,
      CASE WHEN transaction_record->>'parent_transaction_id' IS NULL OR transaction_record->>'parent_transaction_id' = '' OR transaction_record->>'parent_transaction_id' = 'null'
           THEN NULL ELSE (transaction_record->>'parent_transaction_id')::uuid END
    )
    RETURNING id INTO inserted_id;

    results := array_append(results, (SELECT t FROM public.transactions t WHERE t.id = inserted_id));
  END LOOP;

  RETURN QUERY SELECT * FROM unnest(results);
END;
$function$;

-- 3. Remove anonymous execute rights on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.insert_sale(jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.insert_transaction_with_sale(jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_sales() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.insert_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_transaction_with_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;