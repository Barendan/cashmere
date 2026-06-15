-- 1. Drop overly-permissive public SELECT policies
DROP POLICY IF EXISTS "Allow all users to view products" ON public.products;
DROP POLICY IF EXISTS "Allow all users to view transactions" ON public.transactions;

-- 2. Drop "WITH CHECK true" insert policies (role-scoped policies already cover these)
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;

-- 3. Drop duplicate weaker product policies that referenced auth.users.role
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

-- 4. Trigger-based defense against role escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.get_user_role(auth.uid()) <> 'admin' THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_change_admin_only ON public.profiles;
CREATE TRIGGER enforce_role_change_admin_only
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();