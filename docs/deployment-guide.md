# Laso — VPS Deployment Guide (backend + ML on one Oracle server)

Backend (Node/Express) **and** ML (FastAPI) both run on the Oracle E2.1.Micro VPS as versioned Docker images, deployed automatically by GitHub Actions. Supabase stays the database/auth/storage provider; the mobile app ships via EAS local builds.

Pipeline flow (`.github/workflows/ci.yml`):

```
push main → CI green → build & push GHCR images (sha-<tag>)
        → apply Supabase migrations (psql, tracked)
        → SSH to VPS → write .env from secrets → compose pull → up -d
        → health-gate backend + ML → auto-rollback to last good tag on failure
```

---

## GitHub Actions configuration

### Secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS public IP (e.g. `140.238.x.x`) |
| `VPS_USER` | SSH user, e.g. `ubuntu` |
| `VPS_SSH_PRIVATE_KEY` | **Dedicated deploy key**, not your daily key (see Step 1) |
| `VPS_SSH_HOST_KEY` | Output of `ssh-keyscan -H <VPS_HOST>` (pins known_hosts; strongly recommended) |
| `SUPABASE_DB_URL` | Supabase → Connect → Database (session pooler) connection string |
| `REDIS_PASSWORD` | Long random string — required by prod compose |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase dashboard (`sb_secret` / service_role) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEOAPIFY_API_KEY` | Optional Places fallback (`https://myprojects.geoapify.com/`) |
| `GHCR_TOKEN` | GitHub PAT with **read:packages** — used on the VPS to `docker login ghcr.io` and pull the images |

### Variables

| Variable | When to set |
|---|---|
| `SUPABASE_MIGRATIONS_ADOPT_UNTIL` | **On first deploy only**: `010_vital_readings.sql`. Marks migrations 000–010 as applied (schema was provisioned manually) without re-executing them. Delete after first successful deploy. |
| `COMPOSE_PROFILES` | Set to `caddy` once you enable TLS via Caddy |
| `CADDY_DOMAIN` | Your domain when using the Caddy profile |
| `BACKEND_BIND` | `127.0.0.1` with Caddy/Tunnel; leave unset for raw-IP |
| `ALLOWED_ORIGINS` | Comma-separated web origins; leave for native-only |
| `PUBLIC_BACKEND_URL` | Optional post-deploy smoke target (e.g. `https://api.example.com`) |

---

## Step 1 — One-time VPS bootstrap

```bash
# On your machine: create a dedicated CI deploy key (Ed25519, no passphrase)
ssh-keygen -t ed25519 -C "laso-ci-deploy" -f ~/.ssh/laso_deploy_key -N ""

# On the VPS: authorize it
ssh ubuntu@<VPS_HOST> 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys' < ~/.ssh/laso_deploy_key.pub

# Install Docker if not already present
ssh ubuntu@<VPS_HOST> 'curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker ubuntu'

# Pin the host key for the CI known_hosts (recommended, MITM-proof)
ssh-keyscan -H <VPS_HOST>        # paste output into VPS_SSH_HOST_KEY secret

# Swap (1 GB box shared with the Telegram bot) — if not already done
ssh ubuntu@<VPS_HOST> 'test -f /swapfile || (sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile)'
```

Private key contents → `VPS_SSH_PRIVATE_KEY` secret. Keep it out of the repo (`ssh_key*` is gitignored, but this key never belongs on disk in the project).

## Step 2 — Service layout on the VPS

`~/laso/` holds only deploy assets, maintained by CI:

```
~/laso/
├── docker-compose.prod.yml   # scp'd fresh every deploy
├── deploy/
│   └── Caddyfile             # scp'd fresh every deploy
├── .env                      # 0600, rewritten every deploy from GitHub secrets
└── .last-good-tag            # rollback anchor, written on healthy deploys
```

Runtime registry access: `GHCR_TOKEN` is injected per-deploy by `deploy/vps-deploy.sh` (`docker login ghcr.io`) — nothing auth-related persists on the VPS besides `.env` (0600).

No repo clone is needed on the VPS; images come from GHCR.

## Step 3 — TLS options (decide early, switch anytime)

| Mode | Setting | Notes |
|---|---|---|
| Raw IP (default) | nothing | Backend on `:3000` plain HTTP — fine for development, upgrade ASAP for auth traffic |
| Caddy on VPS | `COMPOSE_PROFILES=caddy`, `CADDY_DOMAIN=api.yourdomain.com`, `BACKEND_BIND=127.0.0.1` | Point the domain's A record at the VPS; Caddy issues Let's Encrypt certs automatically. ML is also proxied at `ml.<domain>`. |
| Cloudflare Tunnel | Install `cloudflared` on the VPS, point it at `http://127.0.0.1:3000` with the same compose + `BACKEND_BIND=127.0.0.1` (keep `COMPOSE_PROFILES` unset) | No open ports; be aware the Oracle box is behind no ports with tunnel |

After switching to Caddy/Tunnel, update the mobile `EXPO_PUBLIC_BACKEND_URL` to the HTTPS URL and rebuild/release via EAS (or OTA).

## Step 4 — First deploy

1. Push to `main` (or merge your feature branch).
2. Watch the run: Actions → "Laso CI/CD Pipeline" → jobs `build-push` → `deploy-vps`.
3. Confirm on the VPS:
   ```bash
   ssh ubuntu@<VPS_HOST> 'cat ~/laso/.last-good-tag && docker ps --format "table {{.Names}}\t{{.Status}}"'
   curl http://<VPS_HOST>:3000/health      # raw-IP mode
   ```
4. Remove the `SUPABASE_MIGRATIONS_ADOPT_UNTIL` repository variable so future migrations actually execute.

## Rollback & redeploys

- **Automatic**: unhealthy deploy → previous tag is restarted (see `deploy/vps-deploy.sh`). The job fails so you see it in Slack/email.
- **Manual**: on the VPS `sed -i "s/^BACKEND_TAG=.*/BACKEND_TAG=sha-<old>/" ~/laso/.env` (same for `ML_TAG=`) and `docker compose -f ~/laso/docker-compose.prod.yml up -d`.
- **Anything broken**: re-run `deploy-vps` via Actions → "Run workflow" (covers transient Supabase/network errors too).

## Post-deploy hygiene

- [ ] Supabase Security Advisor after each migration run (RLS advisories)
- [ ] `docker stats` on the VPS when the bot/ML fight for RAM — ml is capped at 450 MB, backend 250 MB, redis 64 MB
- [ ] Keep `ssh_key*` out of git (ssh keys now live in `deploy/keys/`, gitignored; never move them back)
- [ ] ML model updates: commit new `.joblib` files under `ml/models/` — next deploy rebuilds the image automatically

## Automated ops — `.github/workflows/ops.yml`

- **Nightly Supabase backup** (02:00 UTC): `pg_dump` (custom format) of the DB referenced by
  `SUPABASE_DB_URL`, uploaded as the `laso-db-backup` artifact with 30-day retention
  (`overwrite: true` keeps one rolling dump). Restore with
  `pg_restore -d <connection_url> dump`. Also runnable on demand via Actions → "Run workflow".
  On paid Supabase tiers, prefer enabling dashboard backups/PITR in addition.
- **Public uptime check** (every 15 min): pings `PUBLIC_BACKEND_URL/health`. Unhealthy →
  one "Uptime: backend health degraded" issue is opened (no duplicates while unhealthy);
  the issue auto-closes when health returns 200. Requires the `PUBLIC_BACKEND_URL`
  repository variable.
  Consider a dedicated external monitor (e.g. UptimeRobot on the same URL) as a second
  signal — GitHub schedules can lag.

## What changed vs the old docs

- `render.yaml` deleted; Render backend + deploy hook replaced by the VPS pipeline
- ML no longer needs Cloud Run — `ml/Dockerfile.micro` runs on the same VPS
- Migrations are applied by CI (`deploy/apply-migrations.sh`) instead of manual/MCP application
- [docs/deploy-zero-dollar.md](deploy-zero-dollar.md) is superseded by this guide (kept only for its Oracle/VPS notes)
