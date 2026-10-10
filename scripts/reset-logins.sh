#!/usr/bin/env bash
# Gives members a fresh password + PIN and signs out every device they're on.
#
#   bash scripts/reset-logins.sh joan juliet     # just these members
#   bash scripts/reset-logins.sh all             # every member
#   bash scripts/reset-logins.sh                 # asks which members (double-click friendly)
#
# Run it from your own computer. It asks for the admin token (hidden). New
# passwords and PINs are generated HERE, sent once to the app (which keeps
# only a bcrypt hash) and printed at the end for you to hand out privately —
# they never pass through GitHub. Nothing is written to disk.
set -euo pipefail

BASE="${NOMAD_ADMIN_URL:-https://nomad-app-hntl.vercel.app/api/admin}"

# Double-clicked scripts open a window that closes the moment the script
# exits, taking any message with it — so always wait for Enter first.
trap 'echo; read -rp "Press Enter to close this window…" _' EXIT

if [ $# -eq 0 ]; then
  echo "Which members should get a new login?"
  read -rp "Usernames separated by spaces (or 'all'): " -a ARGS
  [ ${#ARGS[@]} -gt 0 ] || { echo "No usernames entered — nothing changed."; exit 1; }
  set -- "${ARGS[@]}"
fi

echo "Paste the admin token, then press Enter."
echo "(Nothing appears while you paste — the token is hidden.)"
read -rsp "Admin token: " TOKEN; echo
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
[ -n "$TOKEN" ] || { echo "No token entered."; exit 1; }

if [ "$1" = "all" ]; then
  STATS=$(curl -sS -w '\n%{http_code}' "$BASE?resource=login-stats&token=$TOKEN")
  [ "${STATS##*$'\n'}" = "200" ] || { echo "Couldn't list members (HTTP ${STATS##*$'\n'}) — check the token."; exit 1; }
  USERNAMES=$(printf '%s' "${STATS%$'\n'*}" | grep -oE '"username":"[^"]+"' | cut -d'"' -f4)
else
  USERNAMES=$(printf '%s\n' "$@" | tr '[:upper:]' '[:lower:]')
fi

echo; echo "These members will get a new password and PIN, and be signed out everywhere:"
printf '  %s\n' $USERNAMES
read -rp "Continue? (y/N) " CONFIRM
[ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] || { echo "Cancelled — nothing changed."; exit 0; }

# Fixed chunks of randomness rather than an endless stream piped into head,
# which trips SIGPIPE under pipefail.
gen_password() { local s; s=$(LC_ALL=C tr -dc 'A-HJ-NP-Za-km-z2-9' < <(head -c 1024 /dev/urandom)); echo "${s:0:12}"; }

gen_pin() {
  local pin
  while :; do
    pin=$(LC_ALL=C tr -dc '0-9' < <(head -c 512 /dev/urandom)); pin=${pin:0:4}
    [ ${#pin} -eq 4 ] || continue
    # Skip the guessable ones: all-same digits, straight runs, years 1900-2029.
    [ -z "${pin//${pin:0:1}/}" ] && continue
    [[ "0123456789 9876543210" == *"$pin"* ]] && continue
    [[ "$pin" =~ ^(19|20[0-2]) ]] && continue
    echo "$pin"; return
  done
}

RESULTS=""
FAILED=0
echo
for username in $USERNAMES; do
  password=$(gen_password)
  pin=$(gen_pin)
  body=$(printf '{"username":"%s","password":"%s","pin":"%s"}' "$username" "$password" "$pin")
  response=$(curl -sS -w '\n%{http_code}' -X POST "$BASE?resource=reset-credentials&token=$TOKEN" \
    -H 'Content-Type: application/json' -d "$body")
  code=${response##*$'\n'}
  if [ "$code" = "200" ]; then
    echo "✓ reset $username"
    RESULTS+=$(printf '%-12s  %-14s  %s' "$username" "$password" "$pin")$'\n'
  else
    echo "✗ $username failed (HTTP $code): ${response%$'\n'*}"
    FAILED=1
  fi
done

if [ -n "$RESULTS" ]; then
  echo; echo "New logins — share each one privately, then close this terminal:"
  printf '%-12s  %-14s  %s\n' USERNAME PASSWORD PIN
  printf '%s' "$RESULTS"
  echo; echo "The members above are signed out on every device; their old logins no longer work."
fi
[ "$FAILED" -eq 0 ]
