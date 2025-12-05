-- Add last_login_at column to users table for tracking login timestamps
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for login tracking queries
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON public.users(last_login_at);