-- 012: GraphQL/postgrest exposure hardening, round 2.
--
-- The mobile client subscribes to Supabase realtime `postgres_changes` on
-- public.vital_readings (HistoryScreen), which requires the `authenticated`
-- role to keep SELECT (governed by an owner-only RLS policy below). The
-- backend Gateway always uses the service-role connection, so every other
-- client-facing role loses direct table access entirely.
--
-- Direct SELECT access enables downstream data discovery via PostgREST and
-- pg_graphql; this removes that surface (lints 0026/0027).

-- 1. No anonymous reads at all (linter 0026).
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. Authenticated role keeps SELECT only on vital_readings (realtime),
--    and only through the owner-only policy below (linter 0027).
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT ON public.vital_readings TO authenticated;

-- 3. Owner-only policy so the realtime channel streams only the user's rows.
CREATE POLICY "vital_readings_owner_select"
  ON public.vital_readings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Definer function: revoking from anon/authenticated alone is insufficient
--    because the PUBLIC role also holds EXECUTE by default (linter 0028/0029).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
