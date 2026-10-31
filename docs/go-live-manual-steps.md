# Go-Live Manual Steps

Everything CI can't do for you. Work top to bottom; earlier steps unlock later ones.
Secrets/context live in `.github/workflows/ci.yml` (deploy-vps job), `deploy/vps-deploy.sh`,
and `docs/deployment-guide.md` (architecture + rollback).

`gh` CLI is assumed logged in (`gh auth status`). Replace `<VPS_HOST>`, `<VPS_IP>` placeholders.

---

## 1. Create the repo secrets

Run each command from the repo root. View/co-edit later at
https://github.com/SamuelIdowu/ai_med_app/settings/secrets/actions

| Secret | How to get it |
|---|---|
| `VPS_HOST` | Your Oracle VPS IP (the one `92-5-43-189.nip.io` maps to, e.g. `92.5.43.189`) |
| `VPS_USER` | Oracle images default to `ubuntu` |
| `VPS_SSH_PRIVATE_KEY` | Full contents of `deploy/keys/ssh_key` (already migrated there; the matching `.pub` goes on the VPS) |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → *Connection string (URI)* → replace `[YOUR-PASSWORD]` with the DB password, **URL-encoded** |
| `REDIS_PASSWORD` | Generate: `openssl rand -hex 24` |
| `SUPABASE_URL` | `https://<your-ref>.supabase.co` (Settings → General) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API keys → *service_role* / `sb_secret_...` |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API keys → *anon* / `sb_publishable_...` (values in root `.env`) |
| `GEMINI_API_KEY` | Google AI Studio — **required by `deploy/vps-deploy.sh` line 14, deploy aborts without it** |
| `GEOAPIFY_API_KEY` | myprojects.geoapify.com — required: deploy script gate (optional functionally, still required in compose) |
| `GHCR_TOKEN` | GitHub PAT with **read:packages** scope (VPS `docker login ghcr.io`) |
| `VPS_SSH_HOST_KEY` (recommended) | From this machine: `ssh-keyscan -H <VPS_HOST>` |

Turnkey commands (values in quotes):

```bash
gh secret set VPS_HOST --body "<VPS_IP>"
gh secret set VPS_USER --body "ubuntu"
gh secret set VPS_SSH_PRIVATE_KEY --body "$(cat deploy/keys/ssh_key)"
gh secret set SUPABASE_DB_URL --body "postgresql://postgres.<ref>:<db-pass>@aws-0-<region>.pooler.supabase.com:5432/postgres"
gh secret set REDIS_PASSWORD --body "<openssl rand -hex 24>"
gh secret set SUPABASE_URL --body "https://<ref>.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "<sb_secret_...>"
gh secret set EXPO_PUBLIC_SUPABASE_URL --body "https://<ref>.supabase.co"
gh secret set EXPO_PUBLIC_SUPABASE_ANON_KEY --body "<sb_publishable_...>"
gh secret set GEMINI_API_KEY --body "<AIza...>"
gh secret set GEOAPIFY_API_KEY --body "<geoapify-key>"
gh secret set GHCR_TOKEN --body "<github_pat>"
gh secret set VPS_SSH_HOST_KEY --body "$(ssh-keyscan -H <VPS_IP>)"
```

## 2. Create the repo variables

```bash
# CRITICAL: without it prod backend falls back to localhost-only CORS
gh variable set ALLOWED_ORIGINS --body "https://92-5-43-189.nip.io"
# enables the uptime monitor (ops.yml) and matters if any web client exists
gh variable set PUBLIC_BACKEND_URL --body "http://92-5-43-189.nip.io:3000"
# one-time adoption of the pre-existing DB schema, REMOVE after first deploy (step 6)
gh variable set SUPABASE_MIGRATIONS_ADOPT_UNTIL --body "010_vital_readings.sql"
# raw-IP mode: 0.0.0.0; after adding Caddy/Tunnel: 127.0.0.1
gh variable set BACKEND_BIND --body "0.0.0.0"
```

Later, when you add a domain + TLS (Step 8):
`VPS_COMPOSE_PROFILES=caddy`, `CADDY_DOMAIN=<domain>`, and flip `BACKEND_BIND` to `127.0.0.1`.

## 3. Grant the deploy key access to the VPS

```bash
ssh -i deploy/keys/ssh_key <VPS_USER>@<VPS_HOST> \
  "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" \
  < deploy/keys/ssh_key.pub
```

If password/interactive login isn't possible yet, paste `deploy/keys/ssh_key.pub`
into the cloud console (Oracle: Instance → Console → SSH keys) or run it via an
existing working key.

## 4. Open the VPS firewall (raw-IP mode)

Oracle needs parity in three layers — set these once:

- **Security List / NSG** (VCN console): allow ingress `0.0.0.0/0` on **3000** (TCP). 80/443 later.
- **Guest OS iptables** (Oracle images ship restrictive defaults):
  ```bash
  ssh <VPS_USER>@<VPS_HOST> \
    "sudo iptables -I INPUT 6 -p tcp --dport 3000 -j ACCEPT && sudo netfilter-persistent save"
  ```
- Sanity check disk/RAM headroom first (`df -h`, `free -m`): free-tier boxes are
  1 GB RAM / ~50 GB disk, and docker pulls need headroom.

## 5. Trigger the first deploy

The push of `e148114` already started a run whose deploy-vps job failed fast on
missing secrets (expected). Once steps 1–2 are done:

1. Actions → "Laso CI/CD Pipeline" → re-run the failed `deploy-vps` job.
2. Confirm locally:
   ```bash
   ssh <VPS_USER>@<VPS_HOST> 'cat ~/laso/.last-good-tag && sudo docker ps --format "table {{.Names}}\t{{.Status}}"'
   # from a machine outside the VPS:
   curl -i http://<VPS_IP>:3000/health
   ```
3. Sanity-check one authenticated endpoint from the mobile app pointed at
   `https://92-5-43-189.nip.io/api/v1`.

## 6. Post-first-deploy cleanup

- **Remove** the migrations adoption var (future migrations must actually run):
  `gh variable delete SUPABASE_MIGRATIONS_ADOPT_UNTIL`
- Supabase → Security Advisor → fix RLS advisories.

## 7. Turn on the ops workflows

- **Backup**: Actions → "Ops (backups + uptime)" → Run workflow → dispatch both jobs once.
  Verify `laso-db-backup` artifact exists (same run). Nightly runs at 02:00 UTC thereafter.
  Restore procedure: `pg_restore -d "<SUPABASE_DB_URL>" laso-db-20260101.dump`.
- **Uptime**: needs `PUBLIC_BACKEND_URL` (set in step 2). Test it in anger:
  `ssh <VPS_USER>@<VPS_HOST> "sudo docker stop laso-backend"` → a GitHub issue should
  appear within ~20 min → `docker start laso-backend` → issue auto-closes on next green ping.
- Optionally add a second, free external monitor (UptimeRobot) on the same `/health` URL —
  GitHub schedulers can lag minutes behind.

## 8. (Recommended) Domain + TLS once available

nip.io works for HTTP, but auth traffic over plain HTTP on `:3000` is the weakest slot
in the current design. When you own a domain:

1. A-record → `<VPS_IP>`.
2. `gh variable set VPS_COMPOSE_PROFILES --body "caddy"`
   `gh variable set CADDY_DOMAIN --body "api.<domain>"`
   `gh variable set BACKEND_BIND --body "127.0.0.1"` (backend then keeps port 80/443 via Caddy; ML proxied at `ml.<domain>`)
3. Open **80/443** in both Oracle layers (security list + iptables, same as step 4).
4. Push any commit to main (or dispatch deploy) → Caddy issues Let's Encrypt cert on first hit.
5. Update `EXPO_PUBLIC_BACKEND_URL` in `mobile/eas.json` / EAS to `https://api.<domain>/api/v1` → rebuild.
6. Move `PUBLIC_BACKEND_URL`/`ALLOWED_ORIGINS` to the HTTPS URL.

## 9. Release the mobile app

- Android (Play Store / internal testing): `npx eas-cli login` → `cd mobile` →
  `eas build -p android --profile production` (AAB) → `eas submit -p android --latest` or
  manual upload to Play Console. `mobile/eas.json` already carries the prod URLs.
- A `production-apk` profile exists if you need a sideloadable APK for internal testing.
- iOS: needs Apple Developer account + `eas-cli build` credentials (app-specific
  password) + a filled-out submit profile in `eas.json` — currently empty `{}`.

## 10. Watch items specific to this box

- 1 GB RAM is shared (ml 450 MB cap, backend 250 MB, redis 64 MB). If deploy OOM-kills
  mid `docker compose pull`, pull one image at a time or add swap:
  `sudo fallocate -l 2G /swapfile; sudo chmod 600 /swapfile; sudo mkswap /swapfile; sudo swapon /swapfile`.
- Scout the 1st deploy's migration step output — the adopt-until mechanism means the
  first run should adopt all 10 migrations; step 6 removes the var so later ones apply.
- `gh run watch` is handy: `gh run list --workflow ci.yml --limit 3`.
