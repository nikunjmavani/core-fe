#!/usr/bin/env sh
# Push deploy + cookie-banner env vars to GitHub Environments (development, production).
#
# Prefer the unified sync:
#   pnpm github:sync --yes --from-config-setup
#
# This script remains as a thin wrapper for `pnpm setup:infra:github-secrets`.
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

NODE_VERSION="${NODE_VERSION:-$(get_var NODE_VERSION)}"
if [ -z "$NODE_VERSION" ]; then
  echo "[setup-github-secrets] Set NODE_VERSION in $CONFIG."
  exit 1
fi

echo "[setup-github-secrets] Syncing GitHub environment secrets from $CONFIG..."
echo "$NODE_VERSION" | gh secret set NODE_VERSION

node scripts/github/sync-env-secrets.mjs --all --from-config-setup

echo "[setup-github-secrets] Done."
echo "[setup-github-secrets] Verify: pnpm validate:github-env"
echo "[setup-github-secrets] Full IaC sync: pnpm github:sync --yes --from-config-setup"
