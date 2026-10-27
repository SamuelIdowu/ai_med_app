# Laso — Zero-Dollar Deployment Plan

Target: $0/month total cost across all services. Owner is responsible only for one-time environment setup (gcloud CLI, Render/Supabase accounts).

## Architecture

```
[Android APK (sideload) + EAS Update OTA]
        |  EXPO_PUBLIC_BACKEND_URL
        v
[Render Free] laso-backend  -- ML_SERVICE_URL --> [Cloud Run Free] laso-ml
        |  (in-memory cache fallback; no Redis required)      (2 vCPU / 2 GB, scale-to-zero)
        v
[Supabase Free] Postgres + Auth + Storage (RLS)

3rd-party: Gemini API (free tier) | Overpass (public) | Geoapify (optional free key)
```

Migrations applied so far via Supabase MCP: `000-009` + `010_vital_readings`.

## Phase 1 — Supabase (Foundation)

Free tier: 500 MB database, 1 GB file storage, 50k MAU, 5 GB egress.

1. Create a free Supabase project. Capture:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never in mobile bundle)
2. Apply migrations from `backend/src/db/migrations/` in filename order (`000` -> `010`) via Supabase MCP or `supabase db push`.
3. Run the seed script to load first-aid guidelines.
4. Verify RLS advisory is clean (Supabase Studio -> Advisories / Security Advisor).

Operational notes:
- Free projects pause after 7 days of near-zero database activity. Regular app traffic prevents this; warning emails are sent before pausing.
- Restore window for paused projects: up to 1 year (data preserved, config restored on resume).
- Snapshot `pg_dump` of schema + data periodically as a free manual backup (no automated backups on Free).

## Phase 2 — ML subsystem

Two $0 paths. Both satisfy the same backend contract (`ML_SERVICE_URL` + `/v1/ml/health`).

### Option A (default): Google Cloud Run

Render Free is 512 MB and cannot hold the torch/transformers stack, and HF Docker Spaces now require PRO.

1. Build & deploy (Cloud Build gets 180 free build minutes/day; image is heavy due to torch — expect ~10-15 min build, first run only):

   ```bash
   gcloud run deploy laso-ml --source ml/ \
     --region us-central1 \
     --memory 2Gi --cpu 2 \
     --allow-unauthenticated \
     --min-instances 0 --max-instances 1 \
     --set-env-vars SAFETY_STRICTNESS=high,CORS_ORIGINS=*
   ```

2. Record the service URL for the next phase (`https://laso-ml-<hash>-<region>.run.app`).
3. Update `render.yaml`: remove the `laso-ml` Render web service; change backend `ML_SERVICE_URL` to `sync: false` and set the Cloud Run URL in the Render dashboard.

Free tier budget consumed: 2M requests/month, 360k GiB-seconds/month, up to 2 vCPU & 2 GB per instance, scale-to-zero.

### Option B (recommended): existing Oracle AMD E2.1.Micro VPS

Verified host already running a Telegram bot. Confirmed shape: ~1 GB RAM (`/dev/shm` 479M), 45 GB disk (38 GB free).

Runtime torch usage is confined to `embedding_engine.py` (`/v1/ml/embed`), which **no production backend code path calls** (`embedText` is test-only; seedGuidelines generates vectors locally). All production endpoints — triage stream/evaluate (pure Python), vitals (sklearn joblib, 981 KB), wound vision (PIL only) — fit comfortably in a ~200-300 MB RSS slim profile.

Slim image included in repo: `ml/Dockerfile.micro` (no torch/transformers/peft/accelerate).

Deploy coexisting with the Telegram bot:

```bash
# 1. Clone repo and build the slim image
cd ~ && git clone https://github.com/SamuelIdowu/ai_med_app.git laso
cd laso/ml && docker build -f Dockerfile.micro -t laso-ml:slim .

# 2. Add swap first (torch-free stack is small but 1 GB host RAM is shared with the bot)
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile \
  && sudo mkswap /swapfile && sudo swapon /swapfile

# 3. Run with a hard memory cap so ML spikes can never OOM the bot
docker run -d --name laso-ml \
  --memory 500m --memory-swap 1g --restart unless-stopped \
  -p 127.0.0.1:8001:8000 \
  -e SAFETY_STRICTNESS=high -e CORS_ORIGINS='*' -e PORT=8000 \
  laso-ml:slim

# 4. Smoke check
curl http://127.0.0.1:8001/health
curl -X POST http://127.0.0.1:8001/v1/ml/triage/vitals \
  -H 'Content-Type: application/json' \
  -d '{"heart_rate":130,"systolic_bp":90,"oxygen_saturation":94}'
```

Exposure:
- Binds `127.0.0.1:8001` — NOT public. Backend is the only consumer.
- If TLS/reverse proxy (Caddy/Nginx) already fronts the bot, add a location block for ML and bind it to `127.0.0.1:8001`, then set `ML_SERVICE_URL=https://<oracle-tls-domain>/ml`. A bash access route with Cloudflare Tunnel also works ($0, no TLS management).
- If no proxy exists and there is no domain: simplest $0 minimal path is Oracle's public listener + `iptables` allow on the chosen port + `ML_SERVICE_URL=http://<ephemeral-public-ip>:8001` (unencrypted, acceptable only because payloads are non-PHI vitals/threshold JSON — ideally still upgrade to TLS later).

Merge into Render dashboard env (single source of truth):

| Var | Value |
| --- | --- |
| `ML_SERVICE_URL` | `http://<oracle-url>:8001` or `https://<oracle-domain>/ml` |
| `SAFETY_STRICTNESS` | already set via Docker env (`high`) — no Render var needed |

Ops notes:
- `--restart unless-stopped` keeps it alive across the bot's redeploys/reboots; Docker handles ordering automatically.
- Oracle free-tier reclamation (idle <20% VM load for 7 days): the always-on Telegram bot consumption covers this.
- Backend degradation on ML loss is already implemented (Render Free also enforces idle restores, same behavior as Cloud Run) — see smoke test.
- Disk budget: slim image ~1.2 GB (vs torch version ~2-4 GB); 38 GB free is ample even with the bot's images.

## Phase 3 — Node backend: Render (Free)

`render.yaml` (Render Blueprint) already targets `plan: free` with `/health` checks.

1. Push repo to GitHub with the updated `render.yaml` (ML service removed, ML_SERVICE_URL set to the Cloud Run URL namespace).
2. In Render: New -> Blueprint -> select repo. This creates `laso-backend` free web service (0.1 CPU / 512 MB, auto TLS, spin-down after 15 min idle).
3. Fill in `sync: false` env vars in the Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS` (comma-separated production web origins)
   - `ML_SERVICE_URL` (Cloud Run URL from Phase 2)
4. Leave `REDIS_URL` unset — the service falls back to in-memory cache via `backend/src/services/cacheService` (no Redis in prod for $0; add Upstash free tier if concurrency grows).
5. `autoDeploy`: enable simple autoDeploy on `main` (free; avoids burning GitHub Actions build minutes).

Free-tier caveats to accept:
- 15-min spin-down -> ~1 min cold start on first request (Render shows a loading page to web clients; mobile clients just see latency).
- 750 free instance-hours/month are shared across the workspace — only the backend runs on Render, so 750h is always sufficient for one always-on service... verify usage after adding PR preview environments.
- SSE streams keep the service warm while connected; a connected SSE client does not count as new inbound HTTP, but active SSE responses do.

## Phase 4 — Mobile app

Distribution decision recorded: **APK sideload + EAS Updates** (not store distribution).

1. Point `EXPO_PUBLIC_BACKEND_URL` at `https://laso-backend.onrender.com/api/v1` (eas.json / `.env`).
2. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` optional — blank omits Android maps key.
3. OTA updates for JS-only changes: `eas update` (free on EAS plan).
4. Android binary: `eas build --local -p android` -> signed APK built on your machine (no EAS build-quota usage), distribute by direct download.
5. iOS: skipped at $0 (TestFlight/App Store require the $99/yr Apple Developer Program). Android-first.

## Phase 5 — Smoke test / handoff

E2E happy path to verify a live deployment:

1. Signup -> Supabase Auth -> profile sync trigger.
2. Guest mode -> offline first-aid protocol flow (no backend dependency).
3. AI chat with SSE streaming.
4. Live triage -> ML service -> safety red-flag interception.
5. Wound photo -> vision -> analysis record.
6. Vitals entry -> `vital_readings` realtime sync.
7. Emergency PDF report generation/provider directory lookup.

Record results in `docs/deploy-zero-dollar-verifications.md` with timestamps + URLs.

## Post-deploy hygiene

- Re-run Supabase security/performance advisor after every migration.
- Confirm upstash/Redis is unnecessary before concurrency crosses ~10-20 simultaneous users (measure before adding).
- Set spend-limit alerts (Render, GCP) even on free plans so accidental overage fails instead of billing silently.
- Keep `.env` out of git; verify via `git check-ignore .env` before first push.

## Cost exposure table

| Item | Channel | $0 constraint |
| --- | --- | --- |
| Database/Auth/Storage | Supabase Free | 500 MB, 1 wk inactivity pause, restore 1 yr |
| Backend | Render Free | 512 MB, 0.1 CPU, 15-min spin-down, 750 h/mo |
| ML Inference | Cloud Run Free | scale-to-zero, 2 vCPU+2 GB, 2M req/mo |
| AI (chat/vision) | Gemini API free tier | rate-limited |
| Map/geocoding | Overpass / Geoapify | public/paid-tiers-free-only-used |
| Charts/logging | Upstash Redis (optional) | free tier if concurrency demands |
| CI | GitHub Actions / manual | free minutes only |
| Mobile build/distribution | EAS local build + sideload | Free EAS plan; OTA `eas update` free |
| Apple distribution | skipped | $99/yr Apple Developer excluded from $0 target |
| Play Store publish | skipped | $25 one-time dev fee excluded from $0 target |

## Rollout checklist

- [ ] Supabase project + migrations `$ supabase db push` or MCP
- [ ] Seed script run
- [ ] Security Advisor clean
- [ ] Cloud Run `laso-ml` deployed + health check
- [ ] `render.yaml` updated (no Render ML service, ML_SERVICE_URL sync:false)
- [ ] Render `laso-backend` blueprint applied, env vars filled
- [ ] `/.health` reachable from public internet for both services
- [ ] Mobile `.env` -> backend URL, `eas build --local -p android`
- [ ] E2E smoke pass (Phase 5 flows)
- [ ] Document store-privacy/stores decision: sideload only for now
