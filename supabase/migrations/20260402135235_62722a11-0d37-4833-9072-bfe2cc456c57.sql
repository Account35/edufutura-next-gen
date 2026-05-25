
-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Users cannot delete accounts" ON public.users;

-- Drop the overly restrictive update policy that prevents subscription changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Re-create user update policy without the subscription_status/account_type restriction
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin can update any user
CREATE POLICY "Admins can update any user"
ON public.users FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any user
CREATE POLICY "Admins can delete any user"
ON public.users FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to insert their own subscription history
CREATE POLICY "Users can insert own subscription history"
ON public.subscription_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
