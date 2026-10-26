# Laso

Mobile-first AI first-aid and emergency assistant. Provides offline-capable first-aid guidance, AI chat, wound/photo analysis, live vitals triage, encrypted medical profiles, and emergency PDF reports — designed for Nigeria and other emerging markets.

> **Not a medical device.** Triage output is advisory; users are directed to emergency services for red-flag conditions.

## Architecture

```
┌─────────────────┐   REST / SSE   ┌──────────────────┐   HTTP    ┌──────────────────┐
│  Mobile (Expo)  │ ─────────────► │ Backend (Express) │ ───────► │  ML Service      │
│  React Native   │                │  TypeScript       │          │  FastAPI/Python  │
└────────┬────────┘                └────────┬─────────┘          └──────────────────┘
         │                                  │
         │  Auth + Postgres + Storage       │  Service-role access
         ▼                                  ▼
┌──────────────────────────────────────────────────────┐
│              Supabase (RLS-secured)                  │
└──────────────────────────────────────────────────────┘
```

| Service | Path | Stack | Port |
|---|---|---|---|
| Mobile client | `mobile/` | Expo 54, React Native 0.81, React Navigation 7 | — |
| Backend gateway | `backend/` | Node 20, TypeScript, Express 5, Gemini AI | 3000 |
| ML subsystem | `ml/` | Python 3.11+, FastAPI, PyTorch, sentence-transformers, scikit-learn | 8000 |

AI flows through the backend only (Gemini via `backend/src/services/geminiService.ts`, local ML via `backend/src/services/mlClient.ts`). The mobile app never holds provider API keys.

## Features

- **Guest & auth modes** — full offline local storage for guests; Supabase sync when authenticated
- **Emergency first-aid protocols** — bleeding, burns, choking, CPR, unconsciousness (offline JSON content)
- **AI chat & voice** — Gemini-powered with streaming; first-aid-anchored system instruction
- **Wound scanner & photo analysis** — camera capture → ML vision engine → structured assessment
- **Live vitals triage** — HR/Spo2/BP → Emergency / Urgent / Non-Urgent (SSE streaming)
- **Encrypted medical profile** — blood type, allergies, medications, chronic conditions, directives, emergency contacts; AES-256 offline PHI vault
- **Emergency report** — guided capture → PDF share (expo-print / pdf-lib)
- **Provider directory** — clinics/hospitals from Supabase with 5-min Redis cache
- **Clinical safety layer** — ML safety engine intercepts 10 red-flag conditions with `SAFETY_STRICTNESS=high`

## Quick start (development)

Prereqs: Node 20+, Python 3.12, Docker (optional), a Supabase project.

### 1. Configure environment

```powershell
Copy-Item .env.example .env   # then fill in real credentials
```

Key variables (see `.env.example` for the full list):

| Variable | Used by | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | backend, mobile | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Admin DB access (never ships to the app) |
| `GEMINI_API_KEY` | backend | Gemini chat + vision |
| `ML_SERVICE_URL` | backend | FastAPI ML endpoint |
| `REDIS_URL`, `REDIS_PASSWORD` | backend | Rate-limit / provider cache (prod) |
| `ALLOWED_ORIGINS` | backend | Comma-separated browser origins |
| `CORS_ORIGINS` | ML | ML service origins (`*` for native clients) |
| `EXPO_PUBLIC_BACKEND_URL` | mobile | API base URL |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | mobile | Optional Android Maps key |

Set the same secrets in GitHub Actions (`.github/workflows/ci.yml` reads
`secrets.*`). The default CI jobs use placeholders and run hermetically; the
manual live E2E job requires real secrets and a disposable Supabase project.

### 2. Database

Apply migrations in `backend/src/db/migrations/` in filename order (see [backend/src/db/migrations/MIGRATIONS.md](backend/src/db/migrations/MIGRATIONS.md)). Then optionally seed guidelines:

```powershell
cd backend
npx ts-node src/db/seeds/seedGuidelines.ts
```

### 3. Run services

Docker (recommended):

```powershell
docker compose up --build          # ml-engine :8000 + backend :3000
docker compose -f docker-compose.prod.yml up --build   # adds Redis
```

Or manually:

```powershell
cd ml; python -m venv .venv; .venv\Scripts\pip install -e .
.venv\Scripts\python cli.py serve --port 8000

cd backend; npm ci; npm run dev

cd mobile; npm ci; npm start       # Expo dev server
```

## Testing

```powershell
cd backend
npm test              # hermetic backend Jest suite
npm run test:mobile   # mobile integration tests (run via backend jest config)
npm run test:live     # live Supabase E2E/integration suites (disposable DB)
npm run test:load     # k6 benchmark runner (requires services up)

cd ml
pytest tests -v       # ML unit + e2e tests
```

`npm test` excludes suites that create real Supabase users, rows, and storage
objects. Run `npm run test:live` only against a disposable project with all
migrations applied (including `009_reconcile_core_schema.sql`).

Mobile TypeScript check: `cd mobile; npx tsc --noEmit`.

CI (GitHub Actions) runs on every push/PR. The live Supabase suite is a manual
`workflow_dispatch` job enabled with the repository variable `RUN_LIVE_E2E=true`.

## ML CLI

The ML subsystem is fully usable standalone — training, EDA, triage, vision, benchmarks:

```powershell
cd ml
python cli.py train-classical      # scikit-learn vitals model → .joblib
python cli.py train --epochs 3     # LoRA fine-tune
python cli.py evaluate             # 50-scenario clinical safety benchmark
python cli.py triage --query "Deep bleeding cut"
```

Full reference: [ml/README.md](ml/README.md).

## Deployment

Before deploying, validate the environment and cloud resources:

```powershell
cd backend
npm run preflight:deploy
```

- [render.yaml](render.yaml) — Render blueprint: `laso-backend` + `laso-ml` Docker services, Oregon, `/health` checks
- [docker-compose.prod.yml](docker-compose.prod.yml) — full stack incl. Redis (password required via `REDIS_PASSWORD`)
- Secrets are configured in the Render dashboard / GitHub Actions secrets — never in the repo
- Production EAS builds require `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; see [docs/setup.md](docs/setup.md#9-production-deployment)
- Render Free's 512 MB ML container may be too small for PyTorch; use a Hugging Face Docker Space or a paid Render plan if it fails

## Documentation

- Product requirements: `docs/prd.md`
- Sprint history: `docs/sprints/`
- Security & audit notes: `docs/implementation_scan_results.md`

> `docs/setup.md` predates the current stack (mentions Clerk/Firebase/Vercel — none are used). Prefer this README.
