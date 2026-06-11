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

# ── 4. TypeScript type checking ──
echo ""
echo "4. Type check..."
pnpm type-check

echo ""
echo "==================="
echo "Before-commit guard passed."
echo ""
