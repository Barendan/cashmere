-- =====================================================================
-- Pre-flight checks. Abort before any DROP if required policies missing.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: profiles has no SELECT policy. New role-check subqueries would silently deny. Aborting.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admins can do everything'
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: profiles is missing the "Admins can do everything" policy. Admins would lose the ability to assign roles. Aborting.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Admin users can do everything'
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: products is missing "Admin users can do everything". Aborting.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions'
      AND policyname = 'Admin users can do everything'
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: transactions is missing "Admin users can do everything". Aborting.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sales'
      AND policyname = 'Admin users can do everything'
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: sales is missing "Admin users can do everything". Aborting.';
  END IF;
END $$;

-- =====================================================================
-- 1. Rewrite get_user_role() to read from profiles (server-controlled),
--    not auth.users.raw_user_meta_data (user-editable).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- =====================================================================
-- 2. finance_transactions: enable RLS + admin/employee policies.
-- =====================================================================
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admin full access on finance_transactions"
  ON public.finance_transactions
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Employees can read finance_transactions" ON public.finance_transactions;
CREATE POLICY "Employees can read finance_transactions"
  ON public.finance_transactions
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS "Employees can insert finance_transactions" ON public.finance_transactions;
CREATE POLICY "Employees can insert finance_transactions"
  ON public.finance_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS "Employees can update finance_transactions" ON public.finance_transactions;
CREATE POLICY "Employees can update finance_transactions"
  ON public.finance_transactions
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'employee'))
  WITH CHECK (public.get_user_role() IN ('admin', 'employee'));

-- =====================================================================
-- 3. Drop overly permissive "Allow authenticated …" catch-alls.
--    Admin ALL + role-scoped policies remain and cover all needed verbs.
-- =====================================================================

-- products
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- transactions
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.transactions;

-- sales
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to update sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to delete sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;

-- =====================================================================
-- 4. profiles: tighten self-update so users cannot change their own role.
--    "Admins can do everything" remains for admin role assignment.
-- =====================================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- =====================================================================
-- 5. Pin search_path on trigger function.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 6. Revoke EXECUTE from anon on SECURITY DEFINER functions.
--    authenticated keeps EXECUTE where the app needs it.
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.insert_transaction_with_sale(jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.insert_transaction_with_sale(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.insert_bulk_transactions(jsonb[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_sales() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_sales() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.insert_sale(jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.insert_sale(jsonb) TO authenticated;

-- handle_new_user fires as a trigger; revoking EXECUTE does not affect signups.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
