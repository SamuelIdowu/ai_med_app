-- Migration 04: Add medical_directives and emergency_notes to medical_profiles table
-- Support emergency alerts (e.g. Pacemaker, Organ Donor, Diabetic, etc.) and freeform paramedic notes
ALTER TABLE public.medical_profiles 
ADD COLUMN IF NOT EXISTS medical_directives jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_notes text;
