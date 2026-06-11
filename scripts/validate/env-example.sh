#!/usr/bin/env sh
# Commit-time check: ensure every required env var name is documented in .env.example.
# No network — only .env.example vs scripts/required-env.txt.
# CI and pre-commit run this.
set -e

cd "$(dirname "$0")/../.."

REQUIRED_LIST="scripts/required-env.txt"
ENV_EXAMPLE=".env.example"

if [ ! -f "$REQUIRED_LIST" ]; then
  echo "[validate-env-example] Required list not found: $REQUIRED_LIST"
  exit 1
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "[validate-env-example] ERROR: $ENV_EXAMPLE not found. Create it and add all required env var names from $REQUIRED_LIST."
  exit 1
fi

# Read required var names (skip empty and # lines)
MISSING=""
while IFS= read -r line || [ -n "$line" ]; do
  line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ -z "$line" ] && continue
  case "$line" in
    \#*) continue ;;
    *)
      var="$line"
      # .env.example may have: VAR=value, VAR=, # VAR description, or VAR = value
      if ! grep -qE "^(#\s*)?${var}\s*[=:]" "$ENV_EXAMPLE" 2>/dev/null; then
        MISSING="${MISSING} ${var}"
      fi
      ;;
  esac
done < "$REQUIRED_LIST"

MISSING=$(echo "$MISSING" | sed 's/^ *//')

if [ -z "$MISSING" ]; then
  echo "[validate-env-example] .env.example documents all required vars from $REQUIRED_LIST."
  exit 0
fi

echo "[validate-env-example] ERROR: .env.example is missing required var(s):$MISSING"
echo ""
echo "Add them to .env.example. Example:"
for v in $MISSING; do
  echo "  $v=<value or placeholder>"
done
echo ""
echo "Required names are listed in $REQUIRED_LIST. Set values in GitHub Actions secrets."
exit 1

