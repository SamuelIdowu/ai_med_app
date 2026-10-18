-- Migration: Add RLS Policies for Encounters and Related Tables
-- Date: 2025-12-18
-- Description: Adds INSERT and SELECT policies for encounters, medical_profiles, photos, and reports tables

-- Users table - Add INSERT policy
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
