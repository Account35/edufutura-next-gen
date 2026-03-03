-- Add `bio` column to users table to store short profile bios
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Optional: no index required for free-text bio
