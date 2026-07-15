#!/usr/bin/env sh
# Lockfile ↔ package.json sync gate.
#
# A change to package.json dependencies or `pnpm.overrides` that does NOT
# regenerate pnpm-lock.yaml produces ERR_PNPM_LOCKFILE_CONFIG_MISMATCH and fails
# EVERY frozen-install CI job — including release-please PRs, whose branch
# inherits the mismatch and goes all-red until it is regenerated.
#
# `pnpm install --frozen-lockfile` is exactly what CI runs: it errors immediately
# on any lockfile/config mismatch (before network work), so we run it locally.
#
# See agent-os/skills/before-commit-guard/SKILL.md and
# agent-os/skills/platform-hygiene/SKILL.md.
set -e

cd "$(dirname "$0")/../.."

if pnpm install --frozen-lockfile --prefer-offline --ignore-scripts >/dev/null 2>&1; then
  echo "[validate-lockfile] OK: pnpm-lock.yaml is in sync with package.json."
  exit 0
fi

echo "[validate-lockfile] ERROR: pnpm-lock.yaml is out of sync with package.json."
echo "  A dependency or pnpm.overrides changed without regenerating the lockfile."
echo "  Fix: run 'pnpm install', then commit package.json AND pnpm-lock.yaml together."
echo "  A desynced lockfile breaks every frozen-install CI job and must never reach main."
echo ""
echo "  pnpm error:"
pnpm install --frozen-lockfile --prefer-offline --ignore-scripts 2>&1 | sed 's/^/    /'
exit 1
