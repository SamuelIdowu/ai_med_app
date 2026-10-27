# Laso — Step-by-Step Deployment Guide ($0)

Concrete ordered runbook for the chosen stack. Companion doc: [deploy-zero-dollar.md](deploy-zero-dollar.md) (architecture, trade-offs, cost table).

Chosen stack:
- **Database/Auth/Storage:** Supabase Free
- **Backend (Node/Express):** Render Free (`render.yaml`)
- **ML (FastAPI):** existing Oracle Cloud E2.1.Micro VPS (shared with a Telegram bot), slim torch-free image `ml/Dockerfile.micro`
- **Mobile:** EAS local builds + OTA updates (`eas.json`), Android APK sideload
- **AI:** Gemini API free tier

---

## Step 0 — Prerequisites

- [ ] Supabase account (done — migrations 000–010 already applied)
- [ ] GitHub repo + push access: `github.com/SamuelIdowu/ai_med_app`
- [ ] Render account (free, no card)
- [ ] SSH access to the Oracle VPS (`ubuntu@instance-20260416-0927`) — docker installed (it hosts the Telegram bot)
- [ ] Gemini API key from https://aistudio.google.com/apikey
- [ ] Expo account for EAS (`npx eas-cli login`)

---

## Step 1 — Oracle VPS: deploy slim ML service

```bash
ssh ubuntu@<oracle-vps>

# 1. Clone
cd ~
git clone https://github.com/SamuelIdowu/ai_med_app.git laso
cd laso/ml

# 2. Build slim image (no torch; ~200-300 MB RSS)
docker build -f Dockerfile.micro -t laso-ml:slim .

# 3. Swap protection (1 GB host RAM is shared with the bot)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Run with hard memory cap so ML can never OOM the bot
docker run -d --name laso-ml \
  --memory 500m --memory-swap 1g \
  --restart unless-stopped \
  -p 127.0.0.1:8001:8000 \
  -e SAFETY_STRICTNESS=high \
  -e CORS_ORIGINS='*' \
  -e PORT=8000 \
  laso-ml:slim

# 5. Smoke test
curl http://127.0.0.1:8001/health
curl -X POST http://127.0.0.1:8001/v1/ml/triage/vitals \
  -H 'Content-Type: application/json' \
  -d '{"heart_rate":130,"systolic_bp":90,"oxygen_saturation":94}'
```

### Step 1b — Expose ML over TLS

Preferred: front it with the same Caddy/Nginx that serves the bot:

```caddyfile
# Caddyfile
ml.<your-domain> {
    reverse_proxy 127.0.0.1:8001
}
```

Alternative ($0, no domain): Cloudflare Tunnel on the VPS:
```bash
cloudflared tunnel create laso-ml
cloudflared tunnel route dns laso-ml ml.<your-cf-domain>
cloudflared tunnel run --url http://127.0.0.1:8001 laso-ml &
sudo systemctl enable --now cloudflared
```

Record for Step 3: `ML_EXPOSED_URL` = `https://ml.<your-domain>` or the tunnel URL.

> If neither proxy/domain is available yet, temporarily use `http://<oracle-public-ip>:8001`
> with an Oracle `iptables` rule (Security List in the console) — payloads are
> non-PHI JSON, but upgrade to TLS when possible.

---

## Step 2 — Supabase: verify & seed

1. Open the Supabase dashboard: confirm migrations 000–010 are applied (SQL editor → check `select * from migrations` style or the tables exist).
> Already done via MCP: `010_vital_readings` applied and RLS-verified.
2. Run the seed script once from your machine:
   ```bash
   cd backend
   npx ts-node src/db/seeds/seedGuidelines.ts
   ```
   (populate `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` first — check that script's own convention if different.)
3. Security Advisor → confirm zero RLS advisories.

---

## Step 3 — Render: deploy backend

1. Push to GitHub with updated `render.yaml` (only `laso-backend`, ML URL as `sync: false`).
2. Render dashboard → **New → Blueprint** → pick the repo.
3. Fill env vars (dashboard → `laso-backend` → Environment):

| Key | Value |
| --- | --- |
| `SUPABASE_URL` | from Supabase (already in `.env.example` style) |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role / `sb_secret` key |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `GEMINI_API_KEY` | free-tier Gemini key |
| `ALLOWED_ORIGINS` | prod web origins (leave `unset`/localhost if mobile-only for now) |
| `ML_SERVICE_URL` | `ML_EXPOSED_URL` from Step 1b |

4. Verify: `curl https://laso-backend.onrender.com/health` → `{"status":"healthy"...}`.
5. Optional: set GitHub secret `RENDER_BACKEND_DEPLOY_HOOK` (Render → Settings → Deploy hook) so `.github/workflows/ci.yml` auto-deploys on `main` pushes.

Free-tier note: service sleeps after 15 min idle; first request wakes it in ~1 min. SSE keeps it warm while connected.

---

## Step 4 — Mobile app

1. Set `mobile/.env`:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://laso-backend.onrender.com/api/v1
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=   # optional
   ```
   (`app.config.js` throws on production builds if any value points at localhost / isn't HTTPS / anon key missing — keep that guard happy.)
2. OTA for JS changes only:
   ```bash
   cd mobile && npx eas-cli update --branch production
   ```
3. Build APK on your machine (no EAS build quota used):
   ```bash
   npx eas-cli build --profile production-apk --local -p android
   ```
4. Distribute APK by direct download (Drive/Telegram/sideload).

---

## Step 5 — End-to-end smoke test

Live flows, in order:
1. Signup → Supabase Auth → profile sync.
2. Guest mode → offline first-aid protocol (no backend).
3. AI chat with SSE streaming (idle-dependent: allow up to 1 min wake).
4. Live triage → ML vitals → red-flag interception (safety engine).
5. Wound photo → vision analysis.
6. Vitals entry → `vital_readings` row + realtime.
7. PDF report + nearby provider lookup.

## Step 6 — Post-deploy hygiene

- [ ] Re-run Supabase Security Advisor after every migration.
- [ ] `git check-ignore .env` before any push (already validated; keep it that way).
- [ ] Don't add extra free-tier Render services (750 h/mo is workspace-shared).
- [ ] VPS: `docker stats laso-ml` if the bot ever fights for RAM; raise swap before memory.
- [ ] Oracle reclamation: bot's steady traffic prevents reclaim; don't pin sustained 100% CPU.
- [ ] Update this file's URLs (supabase project, render service) after first deploy.

## Recovery / redeploys

- **Backend code change:** push `main` (or click Clear cache & deploy in Render).
- **ML update:** `cd laso && git pull && docker build -f Dockerfile.micro -t laso-ml:slim .` → `docker rm -f laso-ml` → re-run `docker run` from Step 1.
- **Supabase paused:** Studio → Resume project (data intact, 1-year window).
- **Rollback:** Render → Deploys → older commit.
