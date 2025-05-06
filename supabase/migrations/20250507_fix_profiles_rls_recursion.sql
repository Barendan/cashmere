
-- Temporarily disable RLS on profiles to fix the recursion issue
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on the profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create a simple policy for SELECT that allows all authenticated users
-- This eliminates the need for role checking during profile queries
CREATE POLICY "Anyone can read profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows users to update only their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Create policy for INSERT (just in case any manual inserts are needed)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Re-enable RLS on the profiles table with the new policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
