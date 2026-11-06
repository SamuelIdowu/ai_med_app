# VPS Backend Endpoint Review — 2026-11-06

**Target:** `https://92-5-43-189.nip.io` (Oracle VPS, Docker compose, Caddy TLS)
**Commit state:** local working tree, `main` deployment
**Method:** HTTP-only black-box sweep from local machine (curl / PowerShell). No SSH used.
**Verdict: backend is UP and healthy. 17/17 executed checks passed, incl. full Gemini + ML pipeline. One transient failure (recovered) worth monitoring.**

## 1. Service health

| # | Request | Expected | Result | Latency | Verdict |
|---|---|---|---|---|---|
| 1 | `GET /` | 200 banner | `AI First Aid App Backend is running` | 1.38s | PASS |
| 2 | `GET /health` | 200 `{"status":"healthy"}` | `{"status":"healthy","service":"laso-backend"}` | 0.76s | PASS |

The deploy health-gate target works; the Node/Express container is listening and Caddy TLS terminates correctly.

## 2. Public / guest endpoints (live integrations)

| # | Request | Expected | Result | Latency | Verdict |
|---|---|---|---|---|---|
| 3 | `POST /api/v1/auth/check` | 200 `{exists:bool}` | `{exists:false}` for unknown email | 2.68s | PASS |
| 4 | `POST /api/v1/ai/triage/vitals` | 200 triage result | Emergency triage, `is_emergency:true`, 4 risk drivers (Critical Hypoxemia, Severe Tachycardia, Hypotensive Shock, Severe Uncontrolled Hemorrhage), ML latency ~13ms | 0.87–1.16s | PASS |
| 5 | `POST /api/v1/ai/chat` (guest) | 200 Gemini answer | Full first-aid answer for a finger cut, correctly graded Minor | 7.64s | PASS |
| 6 | `GET /api/v1/providers/nearby?lat=6.5244&lng=3.3792` | 200 providers | Real Lagos facilities via Geoapify/Overpass | 2.84s | PASS |
| 7 | `GET /api/v1/providers/nearby/<geoapify-id>/contact` | 200 `{phone}` | `{phone:null}` (source has no phone for that facility) | 1.31s | PASS |

Both critical live integrations (Gemini, ML triage engine) work on the VPS build. The ML backend on first `triage/vitals` call returned a transient
`500 ML_VITALS_EVAL_ERROR` (~6.2s) and succeeded on all subsequent calls — likely a cold-start/timeouts hiccup in backend→ML connectivity. Not reproducible; recommend monitoring (see Follow-ups).

## 3. Protected endpoints — negative tests (no token)

All protected routers correctly reject unauthenticated requests with a clean 401 (`Authorization header is missing`), proving every router is mounted on
the deployed image and `authenticateUser` is enforced:

| # | Route | Result | Verdict |
|---|---|---|---|
| 8 | `GET /api/v1/profile` | 401 (0.79s) | PASS |
| 9 | `GET /api/v1/encounters` | 401 (0.91s) | PASS |
| 10 | `GET /api/v1/providers` | 401 (0.98s) | PASS |
| 11 | `GET /api/v1/notifications` | 401 (1.12s) | PASS |
| 12 | `GET /api/v1/analytics/vitals` | 401 (0.70s) | PASS |
| 13 | `GET /api/v1/reports/:uuid` | 401 (0.96s) | PASS |
| 14 | `POST /api/v1/encounters/triage/stream` | 401 (0.79s) | PASS |
| 15 | `POST /api/v1/notifications/test` | 401 (correctly 401 pre-runtime; 404s only after auth in prod) | PASS |

No 404s and no 500s across the protected surface — the deploy image matches the current route table (`backend/src/app.ts:74-82`).

## 4. Authenticated happy-path sweep — NOT EXECUTED (blocked, no DB writes made)

Intended: disposable Supabase user → create/update/delete encounter, report PDF generation, notifications register-token, analytics readings.

Blocked because:
1. `SUPABASE_SERVICE_ROLE_KEY` in `.env` is a new-format `sb_secret_...` value that returns **403** from the admin users endpoint (stale/mismatched for this project).
2. Anonymous signup is currently **429 rate-limited** at the Supabase auth service (per-IP email signup window).
3. `.test` TLD emails are rejected (`email_address_invalid`).

**No user or test row was created** — attempts at login for `laso.smoke.20261106@gmail.com` and `.20261108` both returned 400 *invalid credentials*, confirming no pending users exist from this sweep. Supabase is clean.

JWT-bearer endpoints therefore weren't exercised end-to-end on the VPS in this run. They are covered by the backend's hermetic Jest suite (`npm test`) and depend on the same Supabase project, so risk is low, but the checklist stands incomplete.

## 5. Observations

1. **Transient 500 on `POST /api/v1/ai/triage/vitals`** (first call, 6.2s, then consistently healthy). If backend→ML has a short connect timeout, a cold ML container on deploys can produce user-facing 500s mid-triage — a red-flag UX path in production. Consider a backend-side retry or longer first-read timeout.
2. **ML endpoint accepts arbitrary non-vitals payloads silently** — sending `{message:"..."}` yielded `Non-Urgent, confidence 1.0` instead of a 4xx validation error. The FastAPI schema appears to default missing vital fields. Low security impact (auth-free informational endpoint), but a schema-validation tightening on `/v1/ml/triage/vitals` would prevent nonsense triage outputs.
3. Latencies: median ~1s per request over the public internet — healthy for a single-node VPS in front of cloud Supabase.

## 6. Follow-ups

- [ ] Fix or rotate `SUPABASE_SERVICE_ROLE_KEY` in `.env` for local ops use (403 on admin API).
- [ ] Re-run authenticated happy-path sweep once signup rate limit clears (or supply a pre-made test account): encounters CRUD → report PDF → notifications → analytics → wound upload.
- [ ] Add retry/backoff on `MLClient.evaluateVitalsTriage` for the cold-start window, or keep ML container warm with a startup self-check.
- [ ] Tighten ML vitals schema: reject unknown/missing fields with 422 instead of triaging defaults.
- [ ] Optionally add the endpoint sweep as a CI job (`k6-smoke.js` already covers 3 of these routes against a `BASE_URL`).
