#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/v1"
ADVANCE_DAYS="${ADVANCE_DAYS:-3}"

PASS=0
FAIL=0

green() { echo -e "\033[32m✔ $1\033[0m"; }
red()   { echo -e "\033[31m✘ $1\033[0m"; }
blue()  { echo -e "\033[34m\n▶ $1\033[0m"; }

check_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    green "$label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "$label — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

check_body() {
  local label="$1"
  local expected="$2"
  local body="$3"
  if echo "$body" | grep -qi "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    echo "  expected substring: $expected"
    echo "  body: $(echo "$body" | head -c 300)"
    FAIL=$((FAIL + 1))
  fi
}

http_json() {
  local method="$1"
  local url="$2"
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

valid_scheduled_date() {
  node -e "
    const days = Number(process.argv[1]);
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    process.stdout.write(d.toISOString().slice(0, 10));
  " "$ADVANCE_DAYS"
}

too_soon_scheduled_date() {
  node -e "
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    process.stdout.write(d.toISOString().slice(0, 10));
  "
}

# =============================================================================
# SETUP
# =============================================================================

blue "Typecheck"
pnpm exec tsc --noEmit

blue "Seed (idempotent)"
pnpm seed >/dev/null

blue "Health"
health_out="$(http_json GET "$BASE_URL/health")"
health_code="$(echo "$health_out" | head -n1)"
health_body="$(echo "$health_out" | tail -n +2)"
check_status "GET /health" "200" "$health_code"
check_body "Health returns success" '"status":"success"' "$health_body"

blue "Login tenant"
tenant_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}')"
tenant_code="$(echo "$tenant_out" | head -n1)"
tenant_body="$(echo "$tenant_out" | tail -n +2)"
check_status "Tenant login" "200" "$tenant_code"
TENANT_TOKEN="$(printf '%s' "$tenant_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const t=o?.data?.accessToken;
  if(!t) process.exit(2);
  process.stdout.write(t);
')"

blue "Login agent (listing owner)"
agent_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@rentwiseng.com","password":"Agent@1234"}')"
agent_code="$(echo "$agent_out" | head -n1)"
agent_body="$(echo "$agent_out" | tail -n +2)"
check_status "Agent login" "200" "$agent_code"
AGENT_TOKEN="$(printf '%s' "$agent_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const t=o?.data?.accessToken;
  if(!t) process.exit(2);
  process.stdout.write(t);
')"

blue "Login landlord"
landlord_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@rentwiseng.com","password":"Landlord@1234"}')"
landlord_code="$(echo "$landlord_out" | head -n1)"
landlord_body="$(echo "$landlord_out" | tail -n +2)"
check_status "Landlord login" "200" "$landlord_code"
LANDLORD_TOKEN="$(printf '%s' "$landlord_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const t=o?.data?.accessToken;
  if(!t) process.exit(2);
  process.stdout.write(t);
')"

AGENT_ID="$(http_json GET "$API/users/me" -H "Authorization: Bearer $AGENT_TOKEN" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.user?.id ?? "");
')"
LANDLORD_ID="$(http_json GET "$API/users/me" -H "Authorization: Bearer $LANDLORD_TOKEN" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.user?.id ?? "");
')"

blue "Get verified listing from public search (prefer agent-owned)"
listings_out="$(http_json GET "$API/listings?limit=20&page=1")"
listings_code="$(echo "$listings_out" | head -n1)"
listings_body="$(echo "$listings_out" | tail -n +2)"
check_status "GET /listings" "200" "$listings_code"
LISTING_PICK="$(printf '%s' "$listings_body" | node -e "
  const o=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const items=o?.data?.listings ?? [];
  const agentId=process.argv[1];
  const landlordId=process.argv[2];
  const pick = items.find(l => l.ownerId === agentId)
    || items.find(l => l.ownerId === landlordId)
    || items[0];
  if(!pick?.id) process.exit(2);
  process.stdout.write(JSON.stringify({ id: pick.id, ownerId: pick.ownerId }));
" "$AGENT_ID" "$LANDLORD_ID")"
LISTING_ID="$(printf '%s' "$LISTING_PICK" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).id)')"
LISTING_OWNER_ID="$(printf '%s' "$LISTING_PICK" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).ownerId)')"
if [[ "$LISTING_OWNER_ID" == "$AGENT_ID" ]]; then
  OWNER_TOKEN="$AGENT_TOKEN"
elif [[ "$LISTING_OWNER_ID" == "$LANDLORD_ID" ]]; then
  OWNER_TOKEN="$LANDLORD_TOKEN"
else
  OWNER_TOKEN="$AGENT_TOKEN"
fi
echo "  LISTING_ID=$LISTING_ID"
echo "  LISTING_OWNER_ID=$LISTING_OWNER_ID"

VALID_DATE="$(valid_scheduled_date)"
SOON_DATE="$(too_soon_scheduled_date)"
echo "  VALID_DATE=$VALID_DATE (advance >= $ADVANCE_DAYS days)"
echo "  SOON_DATE=$SOON_DATE (should fail validation)"

# =============================================================================
# HAPPY PATH
# =============================================================================

blue "Tenant books inspection"
book_out="$(http_json POST "$API/inspections" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"scheduledDate\":\"$VALID_DATE\",\"scheduledTime\":\"14:30\"}")"
book_code="$(echo "$book_out" | head -n1)"
book_body="$(echo "$book_out" | tail -n +2)"
check_status "POST /inspections" "201" "$book_code"
check_body "Booked inspection status pending" '"status":"pending"' "$book_body"
INSPECTION_ID="$(printf '%s' "$book_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const id=o?.data?.inspection?.id;
  if(!id) process.exit(2);
  process.stdout.write(id);
')"
echo "  INSPECTION_ID=$INSPECTION_ID"

blue "Owner confirms inspection"
confirm_out="$(http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}')"
confirm_code="$(echo "$confirm_out" | head -n1)"
confirm_body="$(echo "$confirm_out" | tail -n +2)"
check_status "PATCH status → confirmed" "200" "$confirm_code"
check_body "Confirmed status" '"status":"confirmed"' "$confirm_body"

blue "Owner completes inspection"
complete_out="$(http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}')"
complete_code="$(echo "$complete_out" | head -n1)"
complete_body="$(echo "$complete_out" | tail -n +2)"
check_status "PATCH status → completed" "200" "$complete_code"
check_body "Completed status" '"status":"completed"' "$complete_body"

blue "GET /inspections/:id (tenant)"
detail_out="$(http_json GET "$API/inspections/$INSPECTION_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN")"
detail_code="$(echo "$detail_out" | head -n1)"
detail_body="$(echo "$detail_out" | tail -n +2)"
check_status "GET inspection by id" "200" "$detail_code"
check_body "Detail includes inspection id" "$INSPECTION_ID" "$detail_body"

blue "GET /inspections/me (tenant)"
tenant_me_out="$(http_json GET "$API/inspections/me" \
  -H "Authorization: Bearer $TENANT_TOKEN")"
tenant_me_code="$(echo "$tenant_me_out" | head -n1)"
tenant_me_body="$(echo "$tenant_me_out" | tail -n +2)"
check_status "GET /inspections/me tenant" "200" "$tenant_me_code"
check_body "Tenant me list includes inspection" "$INSPECTION_ID" "$tenant_me_body"

blue "GET /inspections/me (owner)"
owner_me_out="$(http_json GET "$API/inspections/me" \
  -H "Authorization: Bearer $OWNER_TOKEN")"
owner_me_code="$(echo "$owner_me_out" | head -n1)"
owner_me_body="$(echo "$owner_me_out" | tail -n +2)"
check_status "GET /inspections/me owner" "200" "$owner_me_code"
check_body "Owner me list includes inspection" "$INSPECTION_ID" "$owner_me_body"

# =============================================================================
# NEGATIVE CASES
# =============================================================================

blue "Non-owner cannot patch status (403)"
forbidden_out="$(http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}')"
forbidden_code="$(echo "$forbidden_out" | head -n1)"
forbidden_body="$(echo "$forbidden_out" | tail -n +2)"
check_status "Tenant patch status forbidden" "403" "$forbidden_code"
check_body "Forbidden message" "forbidden" "$forbidden_body"

blue "Date too soon (422)"
soon_out="$(http_json POST "$API/inspections" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"scheduledDate\":\"$SOON_DATE\",\"scheduledTime\":\"10:00\"}")"
soon_code="$(echo "$soon_out" | head -n1)"
soon_body="$(echo "$soon_out" | tail -n +2)"
check_status "Book with date too soon" "422" "$soon_code"
check_body "Advance days error" "advance" "$soon_body"

blue "Unknown / unverified listing (404)"
UNKNOWN_LISTING_ID="00000000-0000-0000-0000-000000000001"
unverified_out="$(http_json POST "$API/inspections" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$UNKNOWN_LISTING_ID\",\"scheduledDate\":\"$VALID_DATE\",\"scheduledTime\":\"11:00\"}")"
unverified_code="$(echo "$unverified_out" | head -n1)"
unverified_body="$(echo "$unverified_out" | tail -n +2)"
check_status "Book on unknown listing" "404" "$unverified_code"
check_body "Listing not found message" "listing not found" "$unverified_body"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "============================================="
echo "  Inspections Smoke Test"
printf "  \033[32m✔ Passed: $PASS\033[0m\n"
if [[ "$FAIL" -gt 0 ]]; then
  printf "  \033[31m✘ Failed: $FAIL\033[0m\n"
else
  echo "  ✘ Failed: $FAIL"
fi
echo "============================================="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

echo ""
echo "SMOKE PASS"
echo "inspectionId=$INSPECTION_ID"
echo "listingId=$LISTING_ID"
