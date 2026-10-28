#!/usr/bin/env bash
# Runs ON the VPS. Entrypoint: deploy/run-deploy.sh ssh's in and executes this.
# Contract:
#   * deploy assets (docker-compose.prod.yml, Caddyfile) are already scp'd to $DEPLOY_DIR
#   * entire runtime config arrives as sourced env vars (see run-deploy.sh)
#   * on failed health gate, rolls back to .last-good-tag and exits non-zero

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/laso}"
cd "$DEPLOY_DIR"

: "${BACKEND_IMAGE:?}" "${ML_IMAGE:?}" "${DEPLOY_TAG:?}"
: "${REDIS_PASSWORD:?}" "${SUPABASE_SERVICE_ROLE_KEY:?}" "${GEMINI_API_KEY:?}"

# Optional envs default to empty via compose `${VAR:-fallback}` interpolation,
# so they are written unconditionally.
umask 077
cat > .env <<EOF
BACKEND_IMAGE=$BACKEND_IMAGE
BACKEND_TAG=$DEPLOY_TAG
ML_IMAGE=$ML_IMAGE
ML_TAG=$DEPLOY_TAG
REDIS_PASSWORD=$REDIS_PASSWORD
SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
GEOAPIFY_API_KEY=$GEOAPIFY_API_KEY
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
BACKEND_BIND=$BACKEND_BIND
COMPOSE_PROFILES=$COMPOSE_PROFILES
CADDY_DOMAIN=$CADDY_DOMAIN
EOF
chmod 600 .env

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR:-deploy}" --password-stdin
else
  echo "GHCR_TOKEN unset; assuming images are public or already authenticated."
fi

if printf '%s' "${COMPOSE_PROFILES:-}" | grep -qw caddy; then
  if [ -z "${CADDY_DOMAIN:-}" ]; then
    echo "::error::COMPOSE_PROFILES enables caddy but CADDY_DOMAIN is empty."
    exit 1
  fi
fi

echo "Pulling images for $DEPLOY_TAG ..."
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

backend_ok=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 http://127.0.0.1:3000/health >/dev/null 2>&1; then
    backend_ok=1
    break
  fi
  sleep 4
done

ml_ok=0
if [ "$backend_ok" = "1" ]; then
  if docker compose -f docker-compose.prod.yml exec -T backend wget -qO- http://ml-engine:8000/health >/dev/null 2>&1; then
    ml_ok=1
  fi
fi

if [ "$backend_ok" = "1" ] && [ "$ml_ok" = "1" ]; then
  echo "$DEPLOY_TAG" > .last-good-tag
  echo "Deploy $DEPLOY_TAG healthy. Backend /health and ML /health both OK."
  exit 0
fi

echo "::error::Health gate failed (backend_ok=$backend_ok ml_ok=$ml_ok) for $DEPLOY_TAG"
if [ -f .last-good-tag ]; then
  OLD_TAG=$(cat .last-good-tag)
  echo "Rolling back to $OLD_TAG ..."
  sed -i "s/^BACKEND_TAG=.*/BACKEND_TAG=$OLD_TAG/" .env
  sed -i "s/^ML_TAG=.*/ML_TAG=$OLD_TAG/" .env
  docker compose -f docker-compose.prod.yml up -d
  curl -fsS --max-time 5 http://127.0.0.1:3000/health \
    && echo "Rollback to $OLD_TAG complete; VPS serving last known-good build." \
    || echo "::error::Rollback $OLD_TAG also unhealthy — manual intervention required."
else
  echo "::error::No previous good tag to roll back to."
fi
exit 1
