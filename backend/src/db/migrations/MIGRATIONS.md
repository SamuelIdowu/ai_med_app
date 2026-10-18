# Database Migrations

All Supabase/PostgreSQL migrations live in `backend/src/db/migrations/` and are applied **in filename order** (000 → 008) via the Supabase SQL editor (or `psql`).

> These migrations were previously split between `backend/src/db/migrations/` and `infra/supabase/`. The two sets cover different objects and were consolidated here in December 2026.

## Canonical apply order

| # | File | Purpose |
|---|------|---------|
| 000 | `000_initial_schema.sql` | Base schema: `users`, `medical_profiles`, `encounters`, `photos`, `reports`, `providers`, `audit_logs` |
| 001 | `001_core_medical_schema.sql` | Sprint-2 schema: `profiles`*, `encounters`, `triage_messages`, `wound_assessments`, `guideline_embeddings` (pgvector) |
| 002 | `002_rls_security_policies.sql` | RLS for `profiles`, `encounters`, `triage_messages`, `wound_assessments`, `guideline_embeddings` |
| 003 | `003_storage_policies.sql` | Private `medical-images` storage bucket + access policies |
| 004 | `004_audit_logs.sql` | PHI access / critical action audit logging |
| 005 | `005_rls_policies_medical.sql` | RLS for `users`, `medical_profiles`, `encounters`, `photos`, `reports` |
| 006 | `006_profile_photo_fields.sql` | Adds `photo_url`, `gender`, `genotype`, `weight`, `height` to `medical_profiles` |
| 007 | `007_user_sync_trigger.sql` | `handle_new_user()` trigger + backfill from `auth.users` |
| 008 | `008_emergency_directives.sql` | Adds `medical_directives` (jsonb) and `emergency_notes` to `medical_profiles` |

\* `001` creates a `profiles` table that the application code no longer reads (the app uses `medical_profiles` from `000`). Kept for now because `002` attaches RLS to it; consider dropping both in a future migration once verified against production.

## Notes

- Migrations are idempotent where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`), so re-running them is safe.
- One-off helper scripts in `backend/src/scripts/` (`apply-*-migration.ts`, `check-schema.ts`, `verify-db-state.ts`) were used during early sprints. Prefer the SQL files above; the scripts only echo manual instructions.
- After applying migrations, re-seed guideline embeddings if needed: `backend/src/db/seeds/seedGuidelines.ts`.
