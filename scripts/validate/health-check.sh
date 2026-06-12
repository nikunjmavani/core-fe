#!/usr/bin/env sh
# Full project health check: format, lint, biome, docs, type-check, tests, build, size, env, public, tsdoc, structure.
# Run from project root: pnpm health  or  pnpm health:fix
# --fix: run pnpm lint:fix and pnpm format before checks (report-only otherwise).
set -e

cd "$(dirname "$0")/../.."

# Optional colors (disable if not a TTY or TERM unset)
if [ -t 1 ] && [ -n "${TERM:-}" ] && command -v tput >/dev/null 2>&1; then
  RED=$(tput setaf 1)
  GREEN=$(tput setaf 2)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  RED=""
  GREEN=""
  BOLD=""
  RESET=""
fi

PASS="${GREEN}${BOLD}PASS${RESET}"
FAIL="${RED}${BOLD}FAIL${RESET}"

FIX_MODE=0
for arg in "$@"; do
  case "$arg" in
    --fix) FIX_MODE=1 ;;
  esac
done

TOTAL_FAILS=0

echo ""
echo "${BOLD}Project health check${RESET}"
echo "======================="

if [ "$FIX_MODE" = 1 ]; then
  echo ""
  echo "Auto-fix mode: running lint:fix, biome:fix and format..."
  pnpm lint:fix >/dev/null 2>&1 || true
  pnpm biome:fix >/dev/null 2>&1 || true
  pnpm docs:lint:fix >/dev/null 2>&1 || true
  pnpm format >/dev/null 2>&1 || true
  echo ""
fi

echo ""
echo "Phase 1: Format check"
if pnpm format:check >/dev/null 2>&1; then
  echo "  $PASS  pnpm format:check"
else
  echo "  $FAIL  pnpm format:check"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 2: Lint"
if pnpm lint >/dev/null 2>&1; then
  echo "  $PASS  pnpm lint"
else
  echo "  $FAIL  pnpm lint"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 3: Biome"
if pnpm biome:check >/dev/null 2>&1; then
  echo "  $PASS  pnpm biome:check"
else
  echo "  $FAIL  pnpm biome:check"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 4: Docs lint"
if pnpm docs:lint >/dev/null 2>&1; then
  echo "  $PASS  pnpm docs:lint"
else
  echo "  $FAIL  pnpm docs:lint"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 5: Type check"
if pnpm type-check >/dev/null 2>&1; then
  echo "  $PASS  pnpm type-check"
else
  echo "  $FAIL  pnpm type-check"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 6: Unit tests"
if pnpm test >/dev/null 2>&1; then
  echo "  $PASS  pnpm test"
else
  echo "  $FAIL  pnpm test"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 7: Build"
if pnpm build >/dev/null 2>&1; then
  echo "  $PASS  pnpm build"
else
  echo "  $FAIL  pnpm build"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 8: Bundle size"
if pnpm size >/dev/null 2>&1; then
  echo "  $PASS  pnpm size"
else
  echo "  $FAIL  pnpm size"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 9: Env validation"
if pnpm validate:env-example >/dev/null 2>&1; then
  echo "  $PASS  pnpm validate:env-example"
else
  echo "  $FAIL  pnpm validate:env-example"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 10: Public assets"
if pnpm validate:public >/dev/null 2>&1; then
  echo "  $PASS  pnpm validate:public"
else
  echo "  $FAIL  pnpm validate:public"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 11: TSDoc budget"
if pnpm tsdoc:check >/dev/null 2>&1; then
  echo "  $PASS  pnpm tsdoc:check"
else
  echo "  $FAIL  pnpm tsdoc:check"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 12: Knip (dead code)"
if pnpm knip >/dev/null 2>&1; then
  echo "  $PASS  pnpm knip"
else
  echo "  $FAIL  pnpm knip"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "Phase 13: Route-island structure"
if pnpm validate:structure >/dev/null 2>&1; then
  echo "  $PASS  pnpm validate:structure"
else
  echo "  $FAIL  pnpm validate:structure"
  TOTAL_FAILS=$((TOTAL_FAILS + 1))
fi

echo ""
echo "======================="
if [ "$TOTAL_FAILS" -eq 0 ]; then
  echo "${BOLD}${GREEN}All checks passed.${RESET}"
  exit 0
else
  echo "${BOLD}${RED}$TOTAL_FAILS check(s) failed.${RESET}"
  echo "Run the failing command(s) without redirect to see errors (e.g. pnpm lint, pnpm type-check)."
  exit 1
fi
