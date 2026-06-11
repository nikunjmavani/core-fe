#!/usr/bin/env sh
# Set GitHub repository secrets from config.setup.env (VITE_API_BASE_URL, NODE_VERSION).
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

# Extract values from config (skip comments, empty lines)
get_var() {
  grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

VITE_API_BASE_URL="${VITE_API_BASE_URL:-$(get_var VITE_API_BASE_URL_PROD)}"
NODE_VERSION="${NODE_VERSION:-$(get_var NODE_VERSION)}"

if [ -z "$VITE_API_BASE_URL" ]; then
  echo "[setup-github-secrets] Set VITE_API_BASE_URL_PROD in $CONFIG or pass VITE_API_BASE_URL"
  exit 1
fi

if [ -z "$NODE_VERSION" ]; then
  echo "[setup-github-secrets] Set NODE_VERSION in $CONFIG or pass NODE_VERSION (must match package engines / CI)."
  exit 1
fi

echo "[setup-github-secrets] Setting GitHub repository secrets from config..."
echo "$VITE_API_BASE_URL" | gh secret set VITE_API_BASE_URL
echo "$NODE_VERSION" | gh secret set NODE_VERSION

echo "[setup-github-secrets] Done. VITE_API_BASE_URL and NODE_VERSION are set."
echo "[setup-github-secrets] Also add NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID manually or via setup:infra:netlify."
