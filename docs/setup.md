# Laso Setup Guide

This guide covers local development for the current monorepo. For the product
overview and deployment notes, see the repository [README](../README.md).

> Older revisions of this file described a Vercel serverless backend, Clerk,
> Firebase, and an `infra/supabase/` directory. None of those are used. The
> backend runs on Express (Render or Docker), auth is Supabase Auth, push
> delivery uses Expo, and migrations live in `backend/src/db/migrations/`.

## Prerequisites

- Node.js 20+
- Python 3.12 (ML subsystem)
- Docker (optional, for the full stack)
- A Supabase project (Postgres, Auth, Storage)
- Expo CLI / EAS CLI for mobile builds

## 1. Environment

```powershell
Copy-Item .env.example .env
```

Fill in the values in `.env`. The key groups are:

| Variable | Used by | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | backend, mobile | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Admin DB/storage access; never ship to mobile |
| `GEMINI_API_KEY` | backend | Gemini chat and vision |
| `ML_SERVICE_URL` | backend | FastAPI ML endpoint |
| `REDIS_URL`, `REDIS_PASSWORD` | backend, prod compose | Cache and rate limiting |
| `ALLOWED_ORIGINS` | backend | Comma-separated browser origins |
| `CORS_ORIGINS` | ML | ML service origins (`*` for native clients) |
| `EXPO_PUBLIC_BACKEND_URL` | mobile | API base URL |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | mobile | Optional Android Maps key |

`docker-compose.prod.yml` rejects an empty `REDIS_PASSWORD`; there is no
default production password.

## 2. Database

Apply every file in `backend/src/db/migrations/` in filename order (000 through
009) using the Supabase SQL editor or `psql`. Migration details and the apply
order are documented in
[`backend/src/db/migrations/MIGRATIONS.md`](../backend/src/db/migrations/MIGRATIONS.md).

Optional guideline seed:

```powershell
cd backend
npx ts-node src/db/seeds/seedGuidelines.ts
```

If the database predates Sprint 2, migration `009_reconcile_core_schema.sql` is
required before encounter, notification, and report flows work.

## 3. Install dependencies

```powershell
cd backend
npm ci

cd ../mobile
npm ci

cd ../ml
python -m venv .venv
.venv\Scripts\pip install -e .
```

## 4. Run the services

Docker (ML + backend, plus Redis in the prod compose file):

```powershell
docker compose up --build
docker compose -f docker-compose.prod.yml up --build
```

Manual:

```powershell
cd ml
.venv\Scripts\python cli.py serve --port 8000

cd ../backend
npm run dev

cd ../mobile
npm start
```

The backend listens on `:3000`, the ML service on `:8000`, and Expo serves the
mobile client.

## 5. Tests and checks

```powershell
cd backend
npm test              # hermetic unit/controller suite
npm run test:mobile   # mobile integration tests (via backend Jest config)
npm run test:live     # real Supabase E2E/integration suites
npm run lint
npx tsc --noEmit

cd ../mobile
npm run lint
npx tsc --noEmit

cd ../ml
.venv\Scripts\python -m pytest tests -q
```

`npm test` intentionally excludes the live Supabase suites. `npm run test:live`
creates real Auth users, encounters, notifications, and storage objects, so run
it only against a disposable project with all migrations applied.

## 6. Mobile assets

The 3D illustration registry (`mobile/src/assets/illustrations.ts`) points at
the optimized PNGs in `mobile/assets/illustrations/transparent/`.

Regenerate them from the source JPEGs:

```powershell
python mobile/scripts/process_illustrations.py
python mobile/scripts/optimize_illustrations.py
python mobile/scripts/validate_illustrations.py
```

Source JPEGs and optimizer backups are excluded from EAS uploads by
`mobile/.easignore`. Android Google Maps is configured at build time from
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `mobile/app.config.js`.

## 7. CI

`.github/workflows/ci.yml` runs on every push and pull request:

- backend typecheck, lint, and hermetic Jest suite
- ML pytest suite
- mobile typecheck, lint, and integration tests
- Docker Compose configuration validation

The live Supabase E2E job is manual: set the repository variable
`RUN_LIVE_E2E=true`, provide the Supabase secrets, and trigger the workflow with
`workflow_dispatch`.
