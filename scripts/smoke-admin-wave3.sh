#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/v1"

PASS=0
FAIL=0

green() { echo -e "\033[32m✔ $1\033[0m"; }
red()   { echo -e "\033[31m✘ $1\033[0m"; }
blue()  { echo -e "\033[34m\n▶ $1\033[0m"; }

check_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    green "$label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "$label — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

http_json() {
  local method="$1" url="$2"
  shift 2
  local body_file
  body_file="$(mktemp)"
  local code
  code="$(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$url" "$@")"
  printf '%s' "$code"
  echo
  cat "$body_file"
  rm -f "$body_file"
}

blue "Typecheck"
pnpm exec tsc --noEmit

blue "Seed"
pnpm seed >/dev/null

blue "Login admin"
admin_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentwiseng.com","password":"Admin@1234"}')"
check_status "Admin login" "200" "$(echo "$admin_out" | head -n1)"
ADMIN_TOKEN="$(echo "$admin_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"

blue "Login tenant (create report)"
tenant_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}')"
TENANT_TOKEN="$(echo "$tenant_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"

listings_body="$(http_json GET "$API/listings?limit=1" | tail -n +2)"
LISTING_ID="$(printf '%s' "$listings_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.listings?.[0]?.id ?? "");
')"

blue "POST /reports (ensure queue item)"
report_out="$(http_json POST "$API/reports" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetType\":\"listing\",\"targetId\":\"$LISTING_ID\",\"reason\":\"Smoke admin wave3 $(date +%s)\"}")"
report_code="$(echo "$report_out" | head -n1)"
if [[ "$report_code" == "201" ]]; then
  REPORT_ID="$(echo "$report_out" | tail -n +2 | node -e '
    const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
    process.stdout.write(o?.data?.report?.id ?? "");
  ')"
elif [[ "$report_code" == "409" ]]; then
  yellow_msg="duplicate report — using existing open report from queue"
  echo "  $yellow_msg"
fi

blue "GET /admin/reports"
reports_out="$(http_json GET "$API/admin/reports" \
  -H "Authorization: Bearer $ADMIN_TOKEN")"
check_status "GET /admin/reports" "200" "$(echo "$reports_out" | head -n1)"
check_body() {
  echo "$reports_out" | tail -n +2 | grep -q '"queue"' && green "Response has queue" && PASS=$((PASS+1)) || { red "Missing queue"; FAIL=$((FAIL+1)); }
}
check_body

if [[ -z "${REPORT_ID:-}" ]]; then
  REPORT_ID="$(echo "$reports_out" | tail -n +2 | node -e '
    const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
    const r=o?.data?.queue?.find(x=>x.status==="open");
    process.stdout.write(r?.id ?? "");
  ')"
fi

if [[ -n "${REPORT_ID:-}" ]]; then
  blue "PATCH /admin/reports/:id/status → under_review"
  patch_out="$(http_json PATCH "$API/admin/reports/$REPORT_ID/status" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"under_review","note":"Smoke review"}')"
  check_status "PATCH report status" "200" "$(echo "$patch_out" | head -n1)"
else
  red "No report id for PATCH"
  FAIL=$((FAIL + 1))
fi

blue "GET /admin/config"
config_out="$(http_json GET "$API/admin/config" \
  -H "Authorization: Bearer $ADMIN_TOKEN")"
check_status "GET /admin/config" "200" "$(echo "$config_out" | head -n1)"

ORIG_VALUE="$(echo "$config_out" | tail -n +2 | node -e "
  const o=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const row=o?.data?.config?.find(c=>c.key==='inspection_advance_booking_days');
  process.stdout.write(row?.value ?? '3');
")"

blue "PATCH /admin/config/inspection_advance_booking_days"
patch_cfg="$(http_json PATCH "$API/admin/config/inspection_advance_booking_days" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"4"}')"
check_status "PATCH config" "200" "$(echo "$patch_cfg" | head -n1)"

blue "Restore config value"
http_json PATCH "$API/admin/config/inspection_advance_booking_days" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"value\":\"$ORIG_VALUE\"}" >/dev/null

echo ""
echo "============================================="
echo "  Admin Wave 3 Smoke"
printf "  \033[32m✔ Passed: $PASS\033[0m\n"
[[ "$FAIL" -eq 0 ]] || printf "  \033[31m✘ Failed: $FAIL\033[0m\n"
echo "============================================="

[[ "$FAIL" -eq 0 ]] || exit 1
echo "SMOKE PASS (admin wave3)"
