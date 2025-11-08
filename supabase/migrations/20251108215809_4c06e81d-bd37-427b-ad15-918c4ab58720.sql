-- Add missing subscription management fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'payfast',
ADD COLUMN IF NOT EXISTS payfast_subscription_token text,
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_auto_renew boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamp with time zone;

-- Create function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION public.check_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update expired subscriptions
  UPDATE public.users
  SET 
    subscription_status = 'expired',
    account_type = 'free'
  WHERE 
    subscription_end_date < NOW()
    AND subscription_status = 'active'
    AND subscription_cancelled_at IS NULL;
END;
$$;

-- Create trigger for audit logging on user changes
CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log subscription changes
  IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) 
     OR (OLD.account_type IS DISTINCT FROM NEW.account_type) THEN
    INSERT INTO public.user_audit_log (user_id, action_type, action_details)
    VALUES (
      NEW.id,
      'subscription_change',
      jsonb_build_object(
        'old_status', OLD.subscription_status,
        'new_status', NEW.subscription_status,
        'old_type', OLD.account_type,
        'new_type', NEW.account_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on users table
DROP TRIGGER IF EXISTS log_user_changes_trigger ON public.users;
CREATE TRIGGER log_user_changes_trigger
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_changes();

-- Create trigger for login audit logging
CREATE OR REPLACE FUNCTION public.log_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log successful login
  INSERT INTO public.user_audit_log (user_id, action_type, action_details)
  VALUES (
    NEW.id,
    'login',
    jsonb_build_object(
      'timestamp', NOW(),
      'method', 'email'
    )
  );
  
  RETURN NEW;
END;
$$;

-- Update RLS policies for user_audit_log to prevent user modifications
DROP POLICY IF EXISTS "Users cannot insert audit logs" ON public.user_audit_log;
CREATE POLICY "Users cannot insert audit logs" 
ON public.user_audit_log 
FOR INSERT 
WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot update audit logs" ON public.user_audit_log;
CREATE POLICY "Users cannot update audit logs" 
ON public.user_audit_log 
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Users cannot delete audit logs" ON public.user_audit_log;
CREATE POLICY "Users cannot delete audit logs" 
ON public.user_audit_log 
FOR DELETE 
USING (false);

-- Create RLS policy for schools INSERT
DROP POLICY IF EXISTS "Users can add new schools" ON public.schools;
CREATE POLICY "Users can add new schools" 
ON public.schools 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policy to prevent user account deletion
DROP POLICY IF EXISTS "Users cannot delete accounts" ON public.users;
CREATE POLICY "Users cannot delete accounts" 
ON public.users 
FOR DELETE 
USING (false);