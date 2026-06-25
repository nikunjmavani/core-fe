#!/usr/bin/env sh
# Push deploy + cookie-banner env vars to GitHub Environments (development, production).
# Mirrors core-be's per-environment secret model — post-merge CI reads them via
# `secrets: inherit` on the selected GitHub Environment.
#
# Requires: GitHub CLI (gh auth login).
# Run from project root.
set -e

cd "$(dirname "$0")/../.."

if ! command -v gh >/dev/null 2>&1; then
  echo "[setup-github-secrets] GitHub CLI not found. Install: https://cli.github.com/"
  exit 1
fi

CONFIG="${CONFIG_SETUP:-config.setup.env}"
if [ ! -f "$CONFIG" ]; then
  echo "[setup-github-secrets] Config not found: $CONFIG"
  exit 1
fi

get_var() {
  grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

set_env_secret() {
  environment="$1"
  name="$2"
  value="$3"
  if [ -z "$value" ]; then
    echo "[setup-github-secrets] Skipping ${name} for ${environment} (empty)."
    return 0
  fi
  printf '%s' "$value" | gh secret set "$name" --env "$environment"
  echo "[setup-github-secrets] Set ${name} on GitHub environment ${environment}."
}

NODE_VERSION="${NODE_VERSION:-$(get_var NODE_VERSION)}"
if [ -z "$NODE_VERSION" ]; then
  echo "[setup-github-secrets] Set NODE_VERSION in $CONFIG."
  exit 1
fi

echo "[setup-github-secrets] Syncing GitHub environment secrets from $CONFIG..."

# Repository-level (shared across environments)
echo "$NODE_VERSION" | gh secret set NODE_VERSION

DEV_API_URL="$(get_var VITE_API_BASE_URL_DEV)"
PROD_API_URL="$(get_var VITE_API_BASE_URL_PROD)"
DEV_POSTHOG_KEY="$(get_var VITE_POSTHOG_KEY_DEV)"
PROD_POSTHOG_KEY="$(get_var VITE_POSTHOG_KEY_PROD)"
POSTHOG_HOST="$(get_var VITE_POSTHOG_HOST)"
DEV_PRIVACY_URL="$(get_var VITE_PRIVACY_POLICY_URL_DEV)"
PROD_PRIVACY_URL="$(get_var VITE_PRIVACY_POLICY_URL_PROD)"
DEV_NETLIFY_SITE="$(get_var NETLIFY_SITE_DEV)"
PROD_NETLIFY_SITE="$(get_var NETLIFY_SITE_MAIN)"
NETLIFY_TOKEN="$(get_var NETLIFY_AUTH_TOKEN)"

set_env_secret development VITE_API_BASE_URL "$DEV_API_URL"
set_env_secret development VITE_POSTHOG_KEY "$DEV_POSTHOG_KEY"
set_env_secret development VITE_POSTHOG_HOST "$POSTHOG_HOST"
set_env_secret development VITE_PRIVACY_POLICY_URL "$DEV_PRIVACY_URL"
set_env_secret development NETLIFY_SITE_ID "$DEV_NETLIFY_SITE"
set_env_secret development NETLIFY_AUTH_TOKEN "$NETLIFY_TOKEN"

set_env_secret production VITE_API_BASE_URL "$PROD_API_URL"
set_env_secret production VITE_POSTHOG_KEY "$PROD_POSTHOG_KEY"
set_env_secret production VITE_POSTHOG_HOST "$POSTHOG_HOST"
set_env_secret production VITE_PRIVACY_POLICY_URL "$PROD_PRIVACY_URL"
set_env_secret production NETLIFY_SITE_ID "$PROD_NETLIFY_SITE"
set_env_secret production NETLIFY_AUTH_TOKEN "$NETLIFY_TOKEN"

echo "[setup-github-secrets] Done."
echo "[setup-github-secrets] GitHub environments: development (branch dev), production (branch main)."
echo "[setup-github-secrets] Cookie banner: set VITE_PRIVACY_POLICY_URL_* + VITE_POSTHOG_* per env for banner link + consent capture."
