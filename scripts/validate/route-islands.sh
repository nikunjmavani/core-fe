#!/usr/bin/env sh
# Route-island structure validation (agent-accuracy guard).
#   1. Every island under src/pages (dir containing <page>.route.tsx) has its
#      page-prefixed manifest, OVERVIEW.md, and top-level <Page>Page/Layout UI.
#   2. Every path-like backtick reference in an island OVERVIEW.md resolves on
#      disk — OVERVIEW files are the entry docs AI agents read first; a stale
#      reference misleads them more than a missing one.
# Contract: agent-os/rules/file-structure.mdc
# Run from project root: pnpm run validate:structure

cd "$(dirname "$0")/../.."

FAIL=0

fail() {
  echo "  FAIL  $1"
  FAIL=$((FAIL + 1))
}

# ── 1. Island shape ──
for route in $(find src/pages -name '*.route.tsx' | sort); do
  dir=$(dirname "$route")
  file=$(basename "$route")
  prefix=${file%.route.tsx}

  [ "$(basename "$dir")" = "$prefix" ] ||
    fail "$route: route marker prefix '$prefix' does not match directory '$(basename "$dir")'"
  [ -f "$dir/$prefix.page.ts" ] ||
    fail "$dir: missing manifest $prefix.page.ts"
  [ -f "$dir/OVERVIEW.md" ] ||
    fail "$dir: missing OVERVIEW.md"
  if ! ls "$dir"/*Page.tsx >/dev/null 2>&1 && ! ls "$dir"/*Layout.tsx >/dev/null 2>&1; then
    fail "$dir: missing top-level <Page>Page.tsx or <Page>Layout.tsx"
  fi
done

# ── 2. OVERVIEW.md references resolve ──
# A backtick token is checked when it looks like a concrete path: an @/ alias,
# a directory reference ending in /, or a file with a known source extension.
# Tokens containing placeholder/code characters are skipped.
# Negative claims ("this island has no sub-pages") must be phrased without
# backtick paths — the validator treats every backtick path as "should exist".
for ov in $(find src/pages -name 'OVERVIEW.md' | sort); do
  dir=$(dirname "$ov")
  while IFS= read -r tok; do
    [ -n "$tok" ] || continue
    case "$tok" in
      *' '*|*'<'*|*'>'*|*'*'*|*'('*|*')'*|*'{'*|*'}'*|*'|'*|*'?'*|*'='*|*'"'*|*"'"*) continue ;;
    esac
    case "$tok" in
      @/*)
        cand="src/${tok#@/}"
        cand=${cand%/}
        [ -e "$cand" ] ||
          fail "$ov: reference \`$tok\` does not resolve ($cand missing)"
        ;;
      */)
        t=${tok%/}
        [ -d "$dir/$t" ] || [ -d "$t" ] || [ -d "src/$t" ] ||
          fail "$ov: directory reference \`$tok\` not found (island-relative, root, or src/)"
        ;;
      *.ts|*.tsx|*.md|*.css|*.json|*.mjs|*.cjs)
        [ -f "$dir/$tok" ] || [ -f "$tok" ] || [ -f "src/$tok" ] ||
          fail "$ov: file reference \`$tok\` not found (island-relative, root, or src/)"
        ;;
    esac
  done <<EOF
$(grep -o '`[^`]*`' "$ov" | tr -d '`')
EOF
done

ISLANDS=$(find src/pages -name '*.route.tsx' | wc -l | tr -d ' ')
if [ "$FAIL" -eq 0 ]; then
  echo "Route-island structure OK ($ISLANDS islands, all OVERVIEW references resolve)"
  exit 0
else
  echo "$FAIL structure violation(s) across $ISLANDS islands. Contract: agent-os/rules/file-structure.mdc"
  exit 1
fi
