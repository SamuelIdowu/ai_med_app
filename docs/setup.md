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

## 7. Google OAuth

Google sign-in uses Supabase Auth as the OAuth broker. The mobile client never
sees the Google client secret. The flow is:

```text
Web:    Laso web -> Supabase Auth -> Google -> Supabase callback -> Laso web
Native: Laso app -> Supabase Auth -> Google -> Supabase callback -> laso://auth/callback
```

Both the implicit-token callback (`#access_token=...`) and the PKCE code
callback (`?code=...`) are supported by `mobile/src/services/googleAuth.ts`.

### 7.1 Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select the
   project that will own the OAuth client.
2. Configure **APIs & Services -> OAuth consent screen**:
   - User type: **External** for public users.
   - App name, user support email, and developer contact email.
   - Scopes: `openid`, `email`, `profile` (the defaults used by Supabase).
   - While the app is in **Testing**, add every Google account that needs to
     sign in as a test user, or publish the app.
3. Open **APIs & Services -> Credentials -> Create credentials -> OAuth client
   ID** and choose **Web application**.
4. Add authorized JavaScript origins:
   - `http://localhost:8081` for local Expo web.
   - Your production web origin, for example `https://app.example.com`.
5. Add this authorized redirect URI exactly:
   - `https://<project-ref>.supabase.co/auth/v1/callback`

   Replace `<project-ref>` with the Supabase project ref from
   `EXPO_PUBLIC_SUPABASE_URL`. Google redirects to Supabase, not directly to
   the app, so do **not** put `laso://auth/callback` in Google Cloud.
6. Copy the **Client ID** and **Client secret** for the next step.

### 7.2 Supabase Dashboard

1. Open **Authentication -> Providers -> Google**, enable it, paste the Client
   ID and Client secret, and save.
2. Open **Authentication -> URL Configuration**.
3. Set **Site URL** to the production web origin, for example
   `https://app.example.com`.
4. Add these **Redirect URLs**:
   - `http://localhost:8081`
   - Your production web origin, for example `https://app.example.com`
   - `laso://auth/callback` for development and standalone native builds
   - Optional, only if testing inside Expo Go:
     `exp://<your-lan-or-tunnel-host>/--/auth/callback`

   Use exact URLs. Do not add wildcards to production projects.
5. Keep the Google client secret only in Supabase. Never put it in
   `mobile/`, EAS secrets, or any `EXPO_PUBLIC_*` variable.

### 7.3 App configuration

`mobile/app.json` already declares the custom scheme:

```json
"scheme": "laso"
```

The native redirect is therefore `laso://auth/callback`. No Google client ID
or secret is needed in the mobile environment.

### 7.4 Run and verify

Web:

```powershell
cd mobile
npm start -- --web
```

Open `http://localhost:8081`, choose **Continue with Google**, and confirm the
browser returns to the app with an authenticated session.

Native development build:

```powershell
cd mobile
npx expo run:android
# or
npx expo run:ios
```

The custom scheme is registered only in a development or standalone build.
Expo Go uses an `exp://` redirect and is best-effort only; use a development
build for reliable native Google sign-in.

Common errors:

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | Add `https://<project-ref>.supabase.co/auth/v1/callback` to the Google OAuth client's authorized redirect URIs. |
| `provider is not enabled` | Enable Google under Supabase **Authentication -> Providers**. |
| Callback opens but no session is created | Add the exact callback URL to Supabase **Redirect URLs**; check that the scheme is `laso`. |
| Expo Go returns to the wrong place | Use a development build so `laso://auth/callback` is registered. |
| `invalid flow state` | Ensure the app uses the same Supabase project and storage between starting and completing the PKCE flow. |

## 8. CI

`.github/workflows/ci.yml` runs on every push and pull request:

- backend typecheck, lint, and hermetic Jest suite
- ML pytest suite
- mobile typecheck, lint, and integration tests
- Docker Compose configuration validation

The live Supabase E2E job is manual: set the repository variable
`RUN_LIVE_E2E=true`, provide the Supabase secrets, and trigger the workflow with
`workflow_dispatch`.

## 9. Production deployment

### 9.1 Preflight

Run the deployment checks before pushing:

```powershell
cd backend
npm run preflight:deploy
```

The script verifies the Supabase URL, service-role key, anonymous key, Google
provider, required tables, `medical-images` storage bucket, Gemini key, and the
ML service URL. It prints pass/fail lines without revealing secret values.

Required Supabase setup:

- Apply migrations `000` through `009` in `backend/src/db/migrations/`.
- Keep the `medical-images` bucket private.
- Enable **Authentication -> Providers -> Google**.
- Set the production **Site URL** and exact **Redirect URLs**.
- Configure custom SMTP before opening email signup to the public.

### 9.2 Render backend and ML

1. Push the release branch to GitHub.
2. In Render, create a Blueprint from the repository and select `render.yaml`.
3. Set these backend secrets in the Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS` for any deployed web client
   - `REDIS_URL` if using a managed Redis instance
4. Confirm `ML_SERVICE_URL` resolves to a full URL. The backend normalizes a
   bare Render hostname to `https://`, but a full URL is clearer.
5. Verify `https://laso-backend.onrender.com/health` and the ML `/health`
   endpoint.

Render Free gives the ML service only 512 MB of RAM. If PyTorch or
sentence-transformers exceeds that limit, deploy `ml/` as a Docker Space on
Hugging Face and point `ML_SERVICE_URL` at the Space URL.

### 9.3 EAS mobile builds

Set these EAS environment variables for the production profile:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_BACKEND_URL
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (optional)
```

`mobile/app.config.js` rejects production builds that use localhost, emulator,
or private LAN URLs. Then:

```powershell
cd mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build -p android --profile preview
npx eas-cli build -p android --profile production
npx eas-cli build -p ios --profile production
```

The internal preview APK is the first release gate. Test native Google sign-in,
location, maps, offline mode, AI chat, wound analysis, and report generation
before submitting to the stores.

### 9.4 Google consent branding

A `*.supabase.co` project URL on Google's consent screen cannot be removed by
mobile code. Configure Google Auth Platform branding and verification to show
the app name/logo. Fully replacing the Supabase host requires a Supabase custom
domain or an equivalent auth proxy.
