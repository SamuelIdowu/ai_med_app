-- Add photo_url and other missing fields to medical_profiles table
ALTER TABLE public.medical_profiles 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS genotype text,
ADD COLUMN IF NOT EXISTS weight text,
ADD COLUMN IF NOT EXISTS height text;

-- Update RLS policies if necessary (existing ones should cover it since it's just a column)
