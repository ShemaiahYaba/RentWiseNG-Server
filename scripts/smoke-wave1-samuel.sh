#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

json_get() {
  # Usage: json_get "data.accessToken"
  node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const obj = JSON.parse(fs.readFileSync(0, "utf8"));
    const val = path.split(".").reduce((a,k)=> (a && a[k] !== undefined) ? a[k] : undefined, obj);
    if (val === undefined || val === null) process.exit(2);
    if (typeof val === "object") process.stdout.write(JSON.stringify(val));
    else process.stdout.write(String(val));
  ' "$1"
}

http() {
  local method="$1"; shift
  local url="$1"; shift
  curl -sS -X "$method" "$url" "$@"
}

assert_json_status() {
  local expected="$1"
  node -e '
    const expected = process.argv[1];
    const raw = require("fs").readFileSync(0, "utf8");
    let o;
    try { o = JSON.parse(raw); } catch (e) {
      console.error("Non-JSON response. First 200 chars:");
      console.error(raw.slice(0, 200));
      process.exit(1);
    }
    if (!o || o.status !== expected) {
      console.error("Unexpected status:", o?.status);
      console.error(JSON.stringify(o));
      process.exit(1);
    }
  ' "$expected"
}

echo "==> Health"
http GET "$BASE_URL/health" | assert_json_status "success"
echo "OK: $BASE_URL/health"

echo "==> Login admin"
ADMIN_LOGIN_JSON="$(http POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentwiseng.com","password":"Admin@1234"}')"
ADMIN_TOKEN="$(printf '%s' "$ADMIN_LOGIN_JSON" | json_get "data.accessToken")"

echo "==> Login tenant"
TENANT_LOGIN_JSON="$(http POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}')"
TENANT_TOKEN="$(printf '%s' "$TENANT_LOGIN_JSON" | json_get "data.accessToken")"
TENANT_ID="$(printf '%s' "$TENANT_LOGIN_JSON" | json_get "data.user.id")"
echo "TENANT_ID=$TENANT_ID"

echo "==> Login landlord (for report target)"
LANDLORD_LOGIN_JSON="$(http POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@rentwiseng.com","password":"Landlord@1234"}')"
LANDLORD_ID="$(printf '%s' "$LANDLORD_LOGIN_JSON" | json_get "data.user.id")"
echo "LANDLORD_ID=$LANDLORD_ID"

echo "==> Users: GET /users/me"
ME_JSON="$(http GET "$BASE_URL/api/v1/users/me" -H "Authorization: Bearer $TENANT_TOKEN")"
printf '%s' "$ME_JSON" | assert_json_status "success"

echo "==> Users: PATCH /users/me (fullName)"
NEW_NAME="Smoke Tenant $(date +%s)"
PATCH_JSON="$(http PATCH "$BASE_URL/api/v1/users/me" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{ "fullName": "$NEW_NAME" }
EOF
)")"
printf '%s' "$PATCH_JSON" | assert_json_status "success"

echo "==> Users: GET /users/me (verify fullName)"
ME2_JSON="$(http GET "$BASE_URL/api/v1/users/me" -H "Authorization: Bearer $TENANT_TOKEN")"
node -e '
  const o = JSON.parse(require("fs").readFileSync(0,"utf8"));
  const fullName = o?.data?.user?.fullName;
  const expected = process.argv[1];
  if (fullName !== expected) {
    console.error("Expected fullName:", expected, "got:", fullName);
    process.exit(1);
  }
' "$NEW_NAME" <<<"$ME2_JSON"
echo "OK: user profile updated"

echo "==> Ensure we have a listingId for reports"
LISTINGS_JSON="$(http GET "$BASE_URL/api/v1/listings?limit=1&page=1")"
LISTING_ID="$(printf '%s' "$LISTINGS_JSON" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const first=o?.data?.listings?.[0];
  if(!first?.id) process.exit(2);
  process.stdout.write(first.id);
' || true)"

if [[ -z "$LISTING_ID" ]]; then
  echo "No public listings found. Run scripts/smoke-listings.sh first to create+verify one."
  exit 1
fi
echo "LISTING_ID=$LISTING_ID"

echo "==> Reports: POST /reports (listing target)"
REPORT1_JSON="$(http POST "$BASE_URL/api/v1/reports" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{ "targetType": "listing", "targetId": "$LISTING_ID", "reason": "Smoke test report on listing" }
EOF
)")"

if printf '%s' "$REPORT1_JSON" | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8")); process.exit(o?.status==="success"?0:1)'; then
  echo "OK: report created"
else
  # Allow 409 if duplicate already exists
  node -e '
    const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
    if (o?.status==="error" && (o?.message||"").includes("open report")) process.exit(0);
    console.error(JSON.stringify(o));
    process.exit(1);
  ' <<<"$REPORT1_JSON"
  echo "OK: report duplicate prevented (expected)"
fi

echo "==> Reports: POST /reports (user target = landlord)"
REPORT2_JSON="$(http POST "$BASE_URL/api/v1/reports" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{ "targetType": "user", "targetId": "$LANDLORD_ID", "reason": "Smoke test report on user" }
EOF
)")"

if printf '%s' "$REPORT2_JSON" | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8")); process.exit(o?.status==="success"?0:1)'; then
  echo "OK: user report created"
else
  node -e '
    const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
    if (o?.status==="error" && (o?.message||"").includes("open report")) process.exit(0);
    console.error(JSON.stringify(o));
    process.exit(1);
  ' <<<"$REPORT2_JSON"
  echo "OK: report duplicate prevented (expected)"
fi

echo "==> Reports: GET /reports/me"
MY_REPORTS_JSON="$(http GET "$BASE_URL/api/v1/reports/me" \
  -H "Authorization: Bearer $TENANT_TOKEN")"
printf '%s' "$MY_REPORTS_JSON" | assert_json_status "success"
node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const n=(o?.data?.reports||[]).length;
  if (n < 1) { console.error("Expected at least 1 report"); process.exit(1); }
' <<<"$MY_REPORTS_JSON"
echo "OK: reports/me returns reports"

echo ""
echo "SMOKE PASS (Samuel Wave 1 endpoints)"

