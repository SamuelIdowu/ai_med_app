-- backend/src/db/migrations/009_reconcile_core_schema.sql
-- Reconcile schema drift between 000_initial_schema.sql and later migrations.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Encounters: 000 created the legacy shape first, so 001's CREATE TABLE IF
-- NOT EXISTS never added the Sprint-2 columns used by the application.
-- ---------------------------------------------------------------------------
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS symptoms TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.encounters
SET title = COALESCE(NULLIF(title, ''), NULLIF(notes, ''), category, 'Emergency Triage')
WHERE title IS NULL OR title = '';

UPDATE public.encounters
SET severity = 'medium'
WHERE severity IS NULL OR severity NOT IN ('low', 'medium', 'high', 'critical');

UPDATE public.encounters
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'in_progress', 'escalated', 'resolved');

UPDATE public.encounters
SET symptoms = '{}'::text[]
WHERE symptoms IS NULL;

UPDATE public.encounters
SET started_at = COALESCE(started_at, created_at, NOW())
WHERE started_at IS NULL;

UPDATE public.encounters
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.encounters
  ALTER COLUMN title SET DEFAULT 'Emergency Triage',
  ALTER COLUMN severity SET DEFAULT 'medium',
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN symptoms SET DEFAULT '{}'::text[],
  ALTER COLUMN started_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.encounters
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN symptoms SET NOT NULL,
  ALTER COLUMN started_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'encounters_severity_check'
  ) THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'encounters_status_check'
  ) THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_status_check
      CHECK (status IN ('active', 'in_progress', 'escalated', 'resolved'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_encounters_updated_at'
  ) THEN
    CREATE TRIGGER update_encounters_updated_at
      BEFORE UPDATE ON public.encounters
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Audit logs: 000 created the table without the compliance columns that 004
-- expects. Add them and backfill existing rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS resource_id TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

UPDATE public.audit_logs SET action = 'UNKNOWN' WHERE action IS NULL;
UPDATE public.audit_logs SET resource_type = 'UNKNOWN' WHERE resource_type IS NULL;
UPDATE public.audit_logs SET metadata = '{}'::jsonb WHERE metadata IS NULL;

ALTER TABLE public.audit_logs
  ALTER COLUMN action SET NOT NULL,
  ALTER COLUMN resource_type SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Notifications: used by notificationService but never created.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'alert', 'success')),
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- An earlier notifications table predates the `data` column and nullable
-- defaults. CREATE TABLE IF NOT EXISTS will not fix that shape.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

UPDATE public.notifications SET data = '{}'::jsonb WHERE data IS NULL;
UPDATE public.notifications SET type = 'info' WHERE type IS NULL;
UPDATE public.notifications SET read = false WHERE read IS NULL;
UPDATE public.notifications SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN type SET DEFAULT 'info',
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN read SET DEFAULT false,
  ALTER COLUMN read SET NOT NULL,
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages notifications" ON public.notifications;
CREATE POLICY "Service role manages notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
