-- backend/src/db/migrations/002_rls_security_policies.sql
-- Sprint 2: Row-Level Security (RLS) Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guideline_embeddings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: users access own profile
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
CREATE POLICY "Users access own profile" 
ON public.profiles FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Encounters: users access their own encounters
DROP POLICY IF EXISTS "Users access own encounters" ON public.encounters;
CREATE POLICY "Users access own encounters" 
ON public.encounters FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Messages: users access messages within their encounters
DROP POLICY IF EXISTS "Users access own messages" ON public.triage_messages;
CREATE POLICY "Users access own messages" 
ON public.triage_messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.encounters e 
    WHERE e.id = encounter_id AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.encounters e 
    WHERE e.id = encounter_id AND e.user_id = auth.uid()
  )
);

-- 4. Wound Assessments: users access assessments within their encounters
DROP POLICY IF EXISTS "Users access own wound assessments" ON public.wound_assessments;
CREATE POLICY "Users access own wound assessments"
ON public.wound_assessments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = encounter_id AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = encounter_id AND e.user_id = auth.uid()
  )
);

-- 5. Guidelines: readable by all authenticated users
DROP POLICY IF EXISTS "Guidelines are publicly readable by auth users" ON public.guideline_embeddings;
CREATE POLICY "Guidelines are publicly readable by auth users" 
ON public.guideline_embeddings FOR SELECT 
TO authenticated 
USING (true);

-- Allow public read of guidelines as well if unauthenticated first aid lookup is required
DROP POLICY IF EXISTS "Guidelines are readable for emergency lookup" ON public.guideline_embeddings;
CREATE POLICY "Guidelines are readable for emergency lookup"
ON public.guideline_embeddings FOR SELECT
TO anon
USING (true);
