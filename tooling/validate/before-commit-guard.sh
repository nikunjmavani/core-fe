#!/usr/bin/env sh
# Before-commit guard — runs on every git commit via .husky/pre-commit.
# Ensures path-to-production gates pass: env docs, public assets, format, lint, types.
# See agent-os/skills/before-commit-guard/SKILL.md for full documentation.
set -e

cd "$(dirname "$0")/../.."

echo ""
echo "Before-commit guard"
echo "==================="

# ── 1. .env.example documents all required vars ──
echo ""
echo "1. Env example validation..."
pnpm run validate:env-example

# ── 2. Required public assets exist ──
echo ""
echo "2. Public assets validation..."
pnpm run validate:public

# ── 3. ESLint + Prettier on staged files ──
echo ""
echo "3. Lint-staged (ESLint --fix + Prettier)..."
pnpm lint-staged

# ── 4. No env/mode sniffing (import.meta.env.DEV/PROD/MODE, environment===) ──
echo ""
echo "4. Env/mode sniffing gate..."
pnpm run validate:vite-env

# ── 5. TypeScript type checking ──
echo ""
echo "5. Type check..."
pnpm type-check

# ── 6. Lockfile ↔ package.json sync (only when deps/overrides change) ──
# A package.json change (dependency or pnpm.overrides) without a regenerated
# pnpm-lock.yaml causes ERR_PNPM_LOCKFILE_CONFIG_MISMATCH and reds every
# frozen-install CI job. Gated on the staged file set so normal commits stay fast.
STAGED_DEPS=$(git diff --cached --name-only --diff-filter=d | grep -E '^(package\.json|pnpm-lock\.yaml)$' || true)
if [ -n "$STAGED_DEPS" ]; then
  echo ""
  echo "6. Lockfile sync..."
  pnpm run validate:lockfile
fi

echo ""
echo "==================="
echo "Before-commit guard passed."
echo ""
