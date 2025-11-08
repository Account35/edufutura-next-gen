-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('free', 'premium');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('inactive', 'active', 'cancelled', 'expired');

-- Create schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  grades_offered INTEGER[] NOT NULL,
  subjects_per_grade JSONB NOT NULL DEFAULT '{}',
  school_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on school_name for search
CREATE INDEX idx_schools_name ON public.schools(school_name);
CREATE INDEX idx_schools_province ON public.schools(province);

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  grade_level INTEGER CHECK (grade_level >= 6 AND grade_level <= 12),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  province TEXT,
  district TEXT,
  city TEXT,
  location_lat DECIMAL,
  location_lng DECIMAL,
  profile_picture_url TEXT,
  account_type public.account_type DEFAULT 'free',
  subscription_status public.subscription_status DEFAULT 'inactive',
  subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'annual')),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  subjects_studying JSONB DEFAULT '[]',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create indexes on frequently queried columns
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone_number);
CREATE INDEX idx_users_school ON public.users(school_id);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create user_audit_log table
CREATE TABLE public.user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on audit log
CREATE INDEX idx_audit_user ON public.user_audit_log(user_id);
CREATE INDEX idx_audit_created ON public.user_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND account_type = (SELECT account_type FROM public.users WHERE id = auth.uid())
    AND subscription_status = (SELECT subscription_status FROM public.users WHERE id = auth.uid())
  );

-- RLS Policies for schools (public read)
CREATE POLICY "Anyone can view schools"
  ON public.schools
  FOR SELECT
  USING (TRUE);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for audit log
CREATE POLICY "Users can view their own audit log"
  ON public.user_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for schools table
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    phone_number,
    full_name,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email_confirmed_at IS NOT NULL
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger to create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample schools for testing
INSERT INTO public.schools (school_name, province, district, grades_offered, subjects_per_grade, school_type) VALUES
  ('Parktown High School for Girls', 'Gauteng', 'Johannesburg', ARRAY[8,9,10,11,12], 
   '{"8": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"], 
     "9": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "10": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "11": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "12": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"]}', 
   'Public'),
  
  ('Rondebosch Boys High School', 'Western Cape', 'Cape Town', ARRAY[8,9,10,11,12],
   '{"8": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "9": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "10": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "11": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "12": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"]}',
   'Public'),
  
  ('St Stithians College', 'Gauteng', 'Johannesburg', ARRAY[6,7,8,9,10,11,12],
   '{"6": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "7": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "8": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "9": ["Mathematics", "English", "Afrikaans", "Natural Sciences", "Social Sciences", "Technology", "Life Orientation"],
     "10": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "11": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"],
     "12": ["Mathematics", "English", "Life Sciences", "Physical Sciences", "Accounting", "Business Studies", "Geography", "History", "Life Orientation"]}',
   'Private');