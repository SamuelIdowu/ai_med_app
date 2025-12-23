-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, but we might need a public profile table if we want to store extra data not in auth.users)
-- However, the architecture doc suggests a 'users' table. 
-- In Supabase, it's common to use a 'profiles' table that references auth.users.
-- But following the tech-arch.md strictly for now, assuming 'users' is a public table or we are just defining the schema concept.
-- Let's create a 'profiles' table that references auth.users to be practical with Supabase.
-- Wait, tech-arch says:
-- users (id uuid PRIMARY KEY, email text UNIQUE, ...)
-- medical_profiles (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id), ...)
-- I will implement this as:
-- public.users (mirror of auth.users or just a table if we are not using Supabase Auth strictly yet? The doc says "Auth via backend (token)" and "Supabase Auth".
-- Let's assume public.users is the user profile table linked to auth.users.

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  phone text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  dob date,
  blood_type text,
  allergies jsonb,       -- array of strings
  medications jsonb,     -- array of objects {name, dose}
  conditions jsonb,      -- array of strings
  emergency_contacts jsonb, -- [{name, phone, relation}]
  encrypted_meta bytea,  -- optional client-side encrypted blob summary
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.encounters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text,             -- 'emergency', 'practice', 'report'
  category text,         -- 'bleeding','burn','choking',...
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE CASCADE,
  storage_path text,     -- S3/Supabase path (encrypted object)
  iv bytea,              -- if client-side encrypted with AES-GCM
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE CASCADE,
  report_path text,      -- generated PDF/package path
  shared_with jsonb,     -- [{method: 'whatsapp', recipient: '+...'}]
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  type text,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies (Basic setup, can be refined later)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Medical Profiles Policies
CREATE POLICY "Users can view own medical profile" ON public.medical_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medical profile" ON public.medical_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medical profile" ON public.medical_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Encounters Policies
CREATE POLICY "Users can view own encounters" ON public.encounters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own encounters" ON public.encounters FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Photos Policies
CREATE POLICY "Users can view own photos" ON public.photos FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.encounters 
    WHERE encounters.id = photos.encounter_id 
    AND encounters.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own photos" ON public.photos FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.encounters 
    WHERE encounters.id = photos.encounter_id 
    AND encounters.user_id = auth.uid()
  ));

-- Reports Policies
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.encounters 
    WHERE encounters.id = reports.encounter_id 
    AND encounters.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.encounters 
    WHERE encounters.id = reports.encounter_id 
    AND encounters.user_id = auth.uid()
  ));

-- Trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_medical_profiles_updated_at BEFORE UPDATE ON public.medical_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
