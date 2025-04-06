
-- Remove any existing RLS policies
DROP POLICY IF EXISTS "Allow all users to insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all users to select transactions" ON public.transactions;

-- Add new RLS policies for transactions table
CREATE POLICY "Allow all users to insert transactions" 
ON public.transactions FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow all users to select transactions" 
ON public.transactions FOR SELECT 
TO authenticated 
USING (true);

-- Enable RLS on the transactions table if it's not already enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
