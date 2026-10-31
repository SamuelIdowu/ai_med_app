# Go-Live Manual Steps — STATUS: deployed & validated (2026-10-31)

The stack is **live**: CI/CD pipeline green, backend+ML+redis containers running on the
VPS (`sha-*` tags from GHCR), migrations tracked in `ci_cd.migration_history`, and the
public API served over **HTTPS** at `https://92-5-43-189.nip.io`.

This document remains as the reference for: how each secret/variable is provisioned,
key recovery, the TLS architecture actually in place, ops-workflow verification, and a
failure-lookup table. Steps below are written so they can be repeated if values rotate.

> Update (same day): manual dispatch deploys now work — Actions → *Laso CI/CD Pipeline*
> → **Run workflow** with the `tag` input (`sha-<short>` from `~/laso/.last-good-tag`,
> or `latest`) skips the build jobs and rolls out the named tag (`docs/deployment-guide.md`
> § Rollback & redeploys).

---

## 0. Where things go — map

| Item | Where it lives |
|---|---|
| 12 GitHub secrets | https://github.com/SamuelIdowu/ai_med_app/settings/secrets/actions → **Secrets** tab |
| 3 GitHub variables | same URL → **Variables** tab (`ALLOWED_ORIGINS`, `PUBLIC_BACKEND_URL`, `BACKEND_BIND`) |
| Runtime env on VPS | `~/laso/.env` — **never edit by hand**; rewritten from GitHub secrets on every deploy |
| TLS front | **systemd `caddy` service on the VPS host** (see §3) |
| Deploy keys | `deploy/keys/` (local, gitignored); canonical private key = `deploy/keys/ssh_key` |
| Mobile prod URLs | `mobile/eas.json` `env` blocks per build profile (already pointing at https nip.io) |

## 1. Secrets — provenance (reference)

How each value is obtained, if it ever needs rotation:

- `VPS_HOST` — the instance's **Public IP address** on *OCI → Compute → Instances → details* (`92.5.43.189`; numeric IP, never the nip.io form).
- `VPS_USER` — `ubuntu` (Oracle Ubuntu images; `opc` only exists on Oracle Linux).
- `VPS_SSH_PRIVATE_KEY` — **entire** text of `deploy/keys/ssh_key` incl. the
  `-----BEGIN/END OPENSSH PRIVATE KEY-----` lines (fingerprint
  `SHA256:4RWkmdlh5dtFFAhjBx8hQZUVSfnuHPJfDVwpz/4Kh7E recovery-key`), *not* the `.pub`.
  Its pubkey is appended to the VPS's `~/.ssh/authorized_keys` (console §2).
- `VPS_SSH_HOST_KEY` — after a successful first ssh from this machine, extract the
  `ssh-ed25519` line from known_hosts:
  ```powershell
  Get-Content $env:USERPROFILE\.ssh\known_hosts | Select-String "^92.5.43.189 ssh-ed25519"
  ```
  Deleting this secret also works — CI auto-keyscans from the runner instead.
- `SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` — Supabase dashboard → *Project Settings → General → URL*.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — *Project Settings → API keys* → publishable/anon key (`sb_publishable_...` / JWT anon role).
- `SUPABASE_SERVICE_ROLE_KEY` — same page → server-only secret (`sb_secret_...`); never put this in a client.
- `SUPABASE_DB_URL` — Supabase **Connect** panel (or *Settings → Database → Connection string*).
  MUST be the **Session pooler URI (port 5432)** — GH runners are IPv4-only (direct
  `db.<ref>.supabase.co` is IPv6-only) and 'transaction' pooler (6543) breaks `pg_dump`.
  **URL-encode** the password (`@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`).
- `REDIS_PASSWORD` — self-generated, e.g. `python -c "import secrets; print(secrets.token_hex(24))"`; nothing to fetch anywhere.
- `GEMINI_API_KEY` — aistudio.google.com → *Get API key* (starts `AIza`). Deploy aborts without it (`deploy/vps-deploy.sh:14`).
- `GEOAPIFY_API_KEY` — myprojects.geoapify.com → Projects → copy key (used for the Places/HF fallback).
- `GHCR_TOKEN` — GitHub → *Settings → Developer settings → Personal access tokens (classic)* → scope **`read:packages`**.
  Classic PAT is required; **fine-grained PATs cannot pull GHCR**. Optional while images
  stay public — the deploy script tolerates its absence.

## 2. Lost-key recovery via serial console (done 2026-10-31, keep as reference)

OCI **cannot** add SSH keys to an existing instance through the console (read-only after
creation) — access is server-side only. With an OS password set on `ubuntu`:

1. OCI → instance → *Bottom-left → Console connection → Create console connection* →
   **Connect via Cloud Shell**.
2. Press Enter → `login: ubuntu` → type the OS password **blind** (no echo) → shell.
3. Ensure the canonical pubkey is present, plus sane ownership/permissions:
   ```bash
   grep -c recovery-key ~/.ssh/authorized_keys     # expect 1
   chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
   chown -R ubuntu:ubuntu ~/.ssh
   ls -la ~/.ssh
   ```
4. Verify from the workstation: `ssh -i deploy/keys/ssh_key ubuntu@<VPS_IP>`.

Gotchas learned first-hand:

- Serial consoles **mangle pastes** — long lines get split and dropped Enters can cause
  something like a stray `~/.ssh/ized_keys` file (192 bytes) and triple-duplicated
  `authorized_keys` lines. Verify with `cat`/`ls` immediately after each step; dedupe/clean at leisure.
- If password login ever fails: from the same console connection, reboot and catch **GRUB**
  (↑/↓ rapidly during first boot seconds), `e` on the first entry, append ` init=/bin/bash`
  to the `linux` line, `Ctrl+X`, then `mount -o remount,rw /` before editing
  `/home/ubuntu/.ssh/authorized_keys`, then `reboot -f`.
- Least-used fallback: detach boot volume → attach as mini-paravirtualized device to a
  temporary free-tier instance → mount the fs, edit `authorized_keys`, clear
  `rm -f /mnt/var/lib/cloud/instances/*/sem/config_ssh*` so cloud-init doesn't revert,
  detach → reattach → start.

## 3. TLS — host systemd caddy (current architecture)

The VPS runs an **apt/systemd `caddy` service** (not a container) with:

```
# /etc/caddy/Caddyfile on the VPS
92-5-43-189.nip.io {
    reverse_proxy 127.0.0.1:3000
}
```

- Public entry point is **https** only; the backend container is bound with
  `BACKEND_BIND=127.0.0.1` (set as a GH variable, flows into `~/laso/.env`), so direct
  `http://<ip>:3000` is intentionally unreachable from outside.
- Why not the compose `caddy` profile for now: the host caddy already owns 80/443; a
  second Caddy in the compose stack would fight for those ports, and the 1 GB RAM box
  prefers fewer containers. The compose profile stays available for a real-domain switch:
  set `VPS_COMPOSE_PROFILES=caddy`, `CADDY_DOMAIN=<domain>`, and disable the host service
  (`sudo systemctl disable --now caddy`) in the same deploy.
- nip.io DNS `<ip>.nip.io` → the IP; Let's Encrypt issuance works for it.
  Current cert: issued 2026-10-29, renews automatically
  (`sudo certmgr`/systemd timer will keep it rolling).

## 4. Repository variables (final state)

```
ALLOWED_ORIGINS    = https://92-5-43-189.nip.io
PUBLIC_BACKEND_URL = https://92-5-43-189.nip.io
BACKEND_BIND       = 127.0.0.1
```

- `SUPABASE_MIGRATIONS_ADOPT_UNTIL` was **not needed**: `ci_cd.migration_history` already
  tracked the ten `backend/src/db/migrations` files (deploy logs show `skip ... (already applied)`).
- Native mobile clients are not subject to CORS; `ALLOWED_ORIGINS` governs browser/web clients.
- `PUBLIC_BACKEND_URL` is consumed by the ops uptime monitor (must include the scheme).

## 5. Ops workflows verification (`.github/workflows/ops.yml`)

- **Backup** — Actions → *Ops (backups + uptime)* → Run workflow → dispatch → confirm
  `laso-db-backup` artifact on the run (nightly at 02:00 UTC thereafter).
  Restore: `pg_restore -d "$SUPABASE_DB_URL" laso-db-<date>.dump`.
- **Uptime** — pings `PUBLIC_BACKEND_URL/health` every 15 min; one `Uptime: backend health
  degraded` issue opens on failure, auto-closes on the next green ping. Consider an
  external second signal (e.g. UptimeRobot) since GH schedulers can lag.

## 6. Failure-lookup table (deploy-vps / CI)

| Symptom | Cause → fix |
|---|---|
| `Host key verification failed` at SSH step | stale/wrong `VPS_SSH_HOST_KEY` → re-set from known_hosts (§1) or delete the secret (CI re-scans) |
| `Permission denied (publickey)` at SSH step | `VPS_SSH_PRIVATE_KEY` ≠ a pubkey in the box's `authorized_keys`, or perms not 700/600 → §2 |
| `Missing required secret: <NAME>` | that secret absent — see §1 list |
| compose: `REDIS_PASSWORD must be set` | `REDIS_PASSWORD` secret missing/expired |
| `GHCR login failed; assuming images are public` | no `GHCR_TOKEN` (or bad scope) — deploys still OK if images are public |
| Backend unhealthy, rollback message in deploy log | check Supabase keys/Gemini (`GEMINI_API_KEY` is a hard gate), then Actions logs |
| Slash re-deploy a known tag | Actions → *Laso CI/CD Pipeline* → *Run workflow* → `tag` input (`sha-<short>` or `latest`) — build jobs skip, deploy-vps runs |
| `wallet...: docker.sock permission denied` on raw docker | `docker` on this box is root-only for `ubuntu` → **use `sudo docker`** |

## 7. Routine validation checklist

```powershell
# 1. Edge: public HTTPS health (must be 200)
curl.exe -i https://92-5-43-189.nip.io/health

# 2. Raw port should now FAIL (closed by BACKEND_BIND=127.0.0.1):
curl.exe --max-time 5 http://92.5.43.189:3000/health   # expect timeout/refused

# 3. CI/CD last run states (build-push + deploy-vps green)
gh run list --repo SamuelIdowu/ai_med_app --limit 3

# 4. On-box (needs sudo):
ssh -i deploy/keys/ssh_key ubuntu@92.5.43.189 "sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
ssh -i deploy/keys/ssh_key ubuntu@92.5.43.189 "cat ~/laso/.last-good-tag"
ssh -i deploy/keys/ssh_key ubuntu@92.5.43.189 "sudo systemctl is-active caddy"

# 5. Migrations state
ssh -i deploy/keys/ssh_key ubuntu@92.5.43.189 "sudo docker exec laso-backend sh -lc '\$PS1' 2>/dev/null; true"
# (ps one-liner): psql check via apply-migrations.sh or Supabase table editor → ci_cd.migration_history
```

## 8. Later items (not deflectors; do not block rollout)

- [ ] `GHCR_TOKEN` classic PAT (read:packages) if GHCR images ever go private
- [ ] Real domain → switch TLS from nip.io host-caddy to a tracked Caddy/Tunnel config (§3)
- [ ] iOS: Apple Developer account, `eas` credentials, fill `submit` profile in `mobile/eas.json`
- [ ] First EAS Android build vs the https URL baked in `mobile/eas.json`
- [ ] Cosmetics on the VPS: dedupe the three `laso-ci-deploy` lines in
      `authorized_keys`, remove leftover `~/.ssh/ized_keys`
- [ ] Supabase dashboard backups/PITR on top of the artifact dumps if moving to a paid tier
