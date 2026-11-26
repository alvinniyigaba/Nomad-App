#!/usr/bin/env bash
# Gives a member access to the admin console (/admin), or takes it away.
#
#   bash scripts/make-staff.sh niyigaba            # grant (role: fund_manager)
#   bash scripts/make-staff.sh niyigaba --remove   # take it away
#
# Run it from your own computer. It asks for the admin token (hidden) — the
# token is the only thing that can grant admin access; a staff login can't.
# After granting, sign in at /admin with that member's own password and PIN.
set -euo pipefail

BASE="${NOMAD_ADMIN_URL:-https://nomad-app-hntl.vercel.app/api/admin}"
trap 'echo; read -rp "Press Enter to close this window…" _' EXIT

USERNAME="${1:-}"
if [ -z "$USERNAME" ]; then read -rp "Username to give admin access: " USERNAME; fi
USERNAME=$(printf '%s' "$USERNAME" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
[ -n "$USERNAME" ] || { echo "No username entered — nothing changed."; exit 1; }

ROLE='"fund_manager"'
[ "${2:-}" = "--remove" ] && ROLE='null'

echo "Paste the admin token, then press Enter."
echo "(Nothing appears while you paste — the token is hidden.)"
read -rsp "Admin token: " TOKEN; echo
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
[ -n "$TOKEN" ] || { echo "No token entered."; exit 1; }

# The audit log and staff_role column come from the schema; applying it is
# a no-op when it's already current.
MIGRATE=$(curl -sS -w '\n%{http_code}' "$BASE?resource=migrate&token=$TOKEN")
[ "${MIGRATE##*$'\n'}" = "200" ] || { echo "Couldn't apply the schema (HTTP ${MIGRATE##*$'\n'}): ${MIGRATE%$'\n'*}"; exit 1; }

RESPONSE=$(curl -sS -w '\n%{http_code}' -X POST "$BASE?resource=staff&token=$TOKEN" \
  -H 'Content-Type: application/json' -d "{\"username\":\"$USERNAME\",\"role\":$ROLE}")
CODE=${RESPONSE##*$'\n'}
if [ "$CODE" = "200" ]; then
  if [ "$ROLE" = "null" ]; then echo "✓ $USERNAME no longer has admin access."
  else echo "✓ $USERNAME can now sign in at ${BASE%/api/admin}/admin"; fi
else
  echo "✗ Failed (HTTP $CODE): ${RESPONSE%$'\n'*}"; exit 1
fi
