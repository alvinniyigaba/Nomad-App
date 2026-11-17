#!/usr/bin/env bash
# Links a member's Nomad Money phone app to Nomad.
#
#   bash scripts/link-money-device.sh niyigaba            # label defaults to "Nomad Money"
#   bash scripts/link-money-device.sh niyigaba "Pixel 8"
#
# Run it from your own computer. It asks for the admin token (hidden), asks the
# app for a device token, and prints it ONCE here. Paste it into
# Nomad Money › Settings › Nomad App link. Nomad keeps only a hash, so the
# token never passes through GitHub or a chat. To unlink a phone:
#   curl -X DELETE "$BASE?resource=money-device&token=…" -H 'Content-Type: application/json' -d '{"id":"<device id>"}'
set -euo pipefail

BASE="${NOMAD_ADMIN_URL:-https://nomad-app-hntl.vercel.app/api/admin}"
trap 'echo; read -rp "Press Enter to close this window…" _' EXIT

USERNAME="${1:-}"
LABEL="${2:-Nomad Money}"
[ -n "$USERNAME" ] || read -rp "Username to link: " USERNAME
USERNAME=$(printf '%s' "$USERNAME" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')

echo "Paste the admin token, then press Enter. (Nothing appears while you paste.)"
read -rsp "Admin token: " TOKEN; echo
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
[ -n "$TOKEN" ] || { echo "No token entered."; exit 1; }

BODY=$(printf '{"username":"%s","label":"%s"}' "$USERNAME" "$LABEL")
OUT=$(curl -sS -w '\n%{http_code}' -X POST "$BASE?resource=money-device&token=$TOKEN" -H 'Content-Type: application/json' -d "$BODY")
CODE="${OUT##*$'\n'}"; JSON="${OUT%$'\n'*}"
[ "$CODE" = "200" ] || { echo "Failed (HTTP $CODE): $JSON"; exit 1; }
DEVICE_TOKEN=$(printf '%s' "$JSON" | grep -oE '"token":"[^"]+"' | cut -d'"' -f4)
echo
echo "Phone linked for $USERNAME. Paste this into Nomad Money (shown once):"
echo
echo "  $DEVICE_TOKEN"
echo
