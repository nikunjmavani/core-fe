#!/usr/bin/env sh
# Setup Netlify link, production env vars, and deploy. Run from project root.
# Requires: pnpm install already run.
# Optional env: NETLIFY_AUTH_TOKEN (avoids browser), NETLIFY_SITE_ID (if not yet linked).
set -e

cd "$(dirname "$0")/../.."

# Load non-secret setup config (safe to commit)
if [ -f "config.setup.env" ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Z0-9_]+=.*' config.setup.env | xargs)
fi

SITE_ID="${NETLIFY_SITE_ID:-e158779a-5efb-4f3b-9b0f-8399d3335066}"
VITE_API_BASE_URL_PROD="${VITE_API_BASE_URL_PROD:-https://core-api.albetrios.com}"

# Link site if not already linked
if ! test -f .netlify/state.json 2>/dev/null; then
  echo "[setup-netlify] Linking site ${SITE_ID}..."
  if [ -n "$NETLIFY_AUTH_TOKEN" ]; then
    pnpm exec netlify link --id "$SITE_ID" --auth "$NETLIFY_AUTH_TOKEN"
  else
    pnpm exec netlify link --id "$SITE_ID"
  fi
fi

# Set production env vars
echo "[setup-netlify] Setting production env vars..."
pnpm exec netlify env:set VITE_API_BASE_URL "$VITE_API_BASE_URL_PROD" --context production

# Deploy to production
echo "[setup-netlify] Building and deploying to production..."
pnpm run deploy:netlify:prod

