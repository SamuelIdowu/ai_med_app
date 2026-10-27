-- Store user submitted or device-sourced vital readings as timestamped events.
CREATE TABLE IF NOT EXISTS public.vital_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN (
    'heart_rate', 'systolic_bp', 'diastolic_bp', 'oxygen_saturation',
    'respiratory_rate', 'body_temperature', 'pain_score'
  )),
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'healthkit', 'health_connect', 'device')),
  external_id TEXT NOT NULL,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source, external_id, metric)
);

CREATE INDEX IF NOT EXISTS idx_vital_readings_user_metric_recorded
  ON public.vital_readings(user_id, metric, recorded_at DESC);

ALTER TABLE public.vital_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own vital readings" ON public.vital_readings;
CREATE POLICY "Users can read their own vital readings"
  ON public.vital_readings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own vital readings" ON public.vital_readings;
CREATE POLICY "Users can insert their own vital readings"
  ON public.vital_readings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vital_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vital_readings;
  END IF;
END $$;
