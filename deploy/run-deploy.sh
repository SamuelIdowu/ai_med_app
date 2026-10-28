#!/usr/bin/env bash
# Runner-side wrapper: ships deploy/vps-deploy.sh to the VPS with the runtime
# config block base64'd so no secret ever appears in a shell command line
# (avoids ps-under-ssh leaks and sourcing issues).
#
# Usage: run-deploy.sh user@host
# All deployment inputs arrive as env vars exported by the deploy-vps job.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: run-deploy.sh user@host"
  exit 1
fi
DEST="$1"

: "${BACKEND_IMAGE:?}" "${ML_IMAGE:?}" "${DEPLOY_TAG:?}" "${REDIS_PASSWORD:?}"

# Keys carried into the VPS environment. printf %q makes every value a safe
# single-line bash assignment.
keys=(
  DEPLOY_TAG BACKEND_IMAGE ML_IMAGE
  REDIS_PASSWORD SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
  EXPO_PUBLIC_SUPABASE_ANON_KEY GEMINI_API_KEY GEOAPIFY_API_KEY
  GHCR_TOKEN GITHUB_ACTOR
  ALLOWED_ORIGINS BACKEND_BIND COMPOSE_PROFILES CADDY_DOMAIN
)
payload=""
for k in "${keys[@]}"; do
  v="${!k:-}"
  payload+="export $k=$(printf %q "$v")"$'\n'
done

ENVPAY=$(printf '%s' "$payload" | base64 -w0)

set -e
ssh "$DEST" "umask 077 && echo $ENVPAY | base64 -d > ~/.laso_deploy_env && source ~/.laso_deploy_env && rm -f ~/.laso_deploy_env && bash -s" < "$(dirname "$0")/vps-deploy.sh"
