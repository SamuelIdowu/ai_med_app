-- 011_audit_hardening.sql — 2026-11-02 full-audit DB hardening
-- 1. audit_logs & incidents had RLS disabled (anon-key exposure). Enable + lock down.
-- 2. medical_profiles / photos / reports had RLS enabled but zero policies.
-- 3. Revoke anon-table SELECT on all PHI-bearing tables (keep public: providers, guideline_embeddings).
-- 4. Function hardening: mutable search_path + public EXECUTE on SECURITY DEFINER trigger fn.
-- Applied directly to the live project via MCP on 2026-11-02 (verify with supabase advisors).

-- ---------- 1) audit_logs ----------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages audit logs" ON public.audit_logs;
CREATE POLICY "Service role manages audit logs"
  ON public.audit_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------- 1) incidents ----------
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own incidents" ON public.incidents;
CREATE POLICY "Users manage own incidents"
  ON public.incidents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role manages incidents" ON public.incidents;
CREATE POLICY "Service role manages incidents"
  ON public.incidents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------- 2) medical_profiles ----------
DROP POLICY IF EXISTS "Users can view own medical profile" ON public.medical_profiles;
CREATE POLICY "Users can view own medical profile"
  ON public.medical_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own medical profile" ON public.medical_profiles;
CREATE POLICY "Users can manage own medical profile"
  ON public.medical_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role manages medical profiles" ON public.medical_profiles;
CREATE POLICY "Service role manages medical profiles"
  ON public.medical_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------- 2) photos ----------
DROP POLICY IF EXISTS "Users can view own photos" ON public.photos;
CREATE POLICY "Users can view own photos"
  ON public.photos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = photos.encounter_id AND e.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert own photos" ON public.photos;
CREATE POLICY "Users can insert own photos"
  ON public.photos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = photos.encounter_id AND e.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can delete own photos" ON public.photos;
CREATE POLICY "Users can delete own photos"
  ON public.photos FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = photos.encounter_id AND e.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Service role manages photos" ON public.photos;
CREATE POLICY "Service role manages photos"
  ON public.photos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------- 2) reports ----------
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = reports.encounter_id AND e.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = reports.encounter_id AND e.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Service role manages reports" ON public.reports;
CREATE POLICY "Service role manages reports"
  ON public.reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------- 3) revoke anon SELECT on PHI tables ----------
REVOKE SELECT ON TABLE public.users FROM anon;
REVOKE SELECT ON TABLE public.medical_profiles FROM anon;
REVOKE SELECT ON TABLE public.encounters FROM anon;
REVOKE SELECT ON TABLE public.photos FROM anon;
REVOKE SELECT ON TABLE public.reports FROM anon;
REVOKE SELECT ON TABLE public.notifications FROM anon;
REVOKE SELECT ON TABLE public.incidents FROM anon;
REVOKE SELECT ON TABLE public.vital_readings FROM anon;
REVOKE SELECT ON TABLE public.wound_assessments FROM anon;
REVOKE SELECT ON TABLE public.triage_messages FROM anon;
REVOKE SELECT ON TABLE public.audit_logs FROM anon;
REVOKE SELECT ON TABLE public.profiles FROM anon;

-- ---------- 4) function hardening ----------
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.match_guidelines(vector, double precision, integer)
  SET search_path = 'public, extensions';
