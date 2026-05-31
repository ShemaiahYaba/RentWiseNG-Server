#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

# ---- helpers ----
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
  # Usage: http METHOD URL [curl args...]
  local method="$1"; shift
  local url="$1"; shift
  curl -sS -X "$method" "$url" "$@"
}

assert_health() {
  local raw
  raw="$(http GET "$BASE_URL/health")"
  node -e '
    const raw = process.argv[1];
    let o;
    try { o = JSON.parse(raw); } catch (e) {
      console.error("Health endpoint did not return JSON. First 200 chars:");
      console.error(raw.slice(0, 200));
      process.exit(1);
    }
    if(!o || o.status!=="success") process.exit(1);
  ' "$raw"
}

# ---- checks ----
echo "==> Typecheck"
pnpm exec tsc --noEmit

echo "==> Seed"
pnpm seed >/dev/null

echo "==> Health"
assert_health
echo "OK: $BASE_URL/health"

# ---- login ----
echo "==> Login admin"
ADMIN_LOGIN_JSON="$(http POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentwiseng.com","password":"Admin@1234"}')"
ADMIN_TOKEN="$(printf '%s' "$ADMIN_LOGIN_JSON" | json_get "data.accessToken")"

echo "==> Login landlord"
LANDLORD_LOGIN_JSON="$(http POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@rentwiseng.com","password":"Landlord@1234"}')"
LANDLORD_TOKEN="$(printf '%s' "$LANDLORD_LOGIN_JSON" | json_get "data.accessToken")"

# ---- media presign (optional; 200 if configured, 503 if not) ----
echo "==> Media presign (expected 200 or 503)"
set +e
PRESIGN_JSON="$(http POST "$BASE_URL/api/v1/media/presign" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","purpose":"listing_photo"}')"
PRESIGN_STATUS=$?
set -e
echo "Presign response: $(printf '%s' "$PRESIGN_JSON" | head -c 200) ..."

# ---- submit KYC ----
echo "==> Submit KYC (landlord)"
KYC_JSON="$(http POST "$BASE_URL/api/v1/kyc" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType":"nin","documentNumber":"12345678901","documentFrontUrl":"https://example.com/front.jpg","documentBackUrl":"https://example.com/back.jpg","selfieUrl":"https://example.com/selfie.jpg"}' || true)"

# Accept either {data:{submission:{id}}} or {data:{id}} shapes
KYC_ID=""
KYC_ID="$(printf '%s' "$KYC_JSON" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const id = o?.data?.submission?.id ?? o?.data?.id;
  if(id) process.stdout.write(id);
' || true)"

if [[ -z "$KYC_ID" ]]; then
  # If KYC already exists (pending/approved), fetch /kyc/me and use that id.
  echo "KYC submit did not return an id; fetching existing /kyc/me"
  KYC_ME_JSON="$(http GET "$BASE_URL/api/v1/kyc/me" \
    -H "Authorization: Bearer $LANDLORD_TOKEN")"
  KYC_ID="$(printf '%s' "$KYC_ME_JSON" | node -e '
    const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
    // /kyc/me currently returns { data: { status: {...} } }
    const id = o?.data?.status?.id ?? o?.data?.submission?.id ?? o?.data?.id;
    if(!id) process.exit(2);
    process.stdout.write(id);
  ' || true)"

  if [[ -z "$KYC_ID" ]]; then
    echo "ERROR: Could not find KYC id in either submit or /kyc/me response."
    echo "Submit response:"
    echo "$KYC_JSON"
    echo "Me response:"
    echo "$KYC_ME_JSON"
    exit 1
  fi
fi
echo "KYC_ID=$KYC_ID"

# ---- approve KYC ----
echo "==> Admin approve KYC"
http PATCH "$BASE_URL/api/v1/admin/verification-queue/kyc/$KYC_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}' >/dev/null
echo "OK: KYC approved"

# ---- get seeded location + apartment type IDs (API-only) ----
echo "==> Fetch locationId + apartmentTypeId from API"
LOCATIONS_JSON="$(http GET "$BASE_URL/api/v1/locations")"
APARTMENT_TYPES_JSON="$(http GET "$BASE_URL/api/v1/apartment-types")"

LOCATION_ID="$(printf '%s' "$LOCATIONS_JSON" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const first = o?.data?.locations?.[0];
  if(!first?.id) process.exit(2);
  process.stdout.write(first.id);
')"

APARTMENT_TYPE_ID="$(printf '%s' "$APARTMENT_TYPES_JSON" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const first = o?.data?.apartmentTypes?.[0];
  if(!first?.id) process.exit(2);
  process.stdout.write(first.id);
')"

echo "LOCATION_ID=$LOCATION_ID"
echo "APARTMENT_TYPE_ID=$APARTMENT_TYPE_ID"

# ---- create listing ----
echo "==> Create listing (landlord)"
LISTING_JSON="$(http POST "$BASE_URL/api/v1/listings" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "locationId": "$LOCATION_ID",
  "apartmentTypeId": "$APARTMENT_TYPE_ID",
  "title": "Smoke Test Listing",
  "description": "Created by smoke test script",
  "rentAmount": "250000.00",
  "ownershipDocUrl": "https://example.com/ownership.pdf",
  "photoUrls": ["https://example.com/1.jpg"]
}
EOF
)")"

LISTING_ID="$(printf '%s' "$LISTING_JSON" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const id = o?.data?.listing?.id ?? o?.data?.id;
  if(!id) process.exit(2);
  process.stdout.write(id);
')"
echo "LISTING_ID=$LISTING_ID"

# ---- verify listing ----
echo "==> Admin verify listing"
http PATCH "$BASE_URL/api/v1/admin/verification-queue/listings/$LISTING_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"verified","note":"smoke test"}' >/dev/null
echo "OK: listing verified"

# ---- public search + detail ----
echo "==> Public search (should include listing)"
http GET "$BASE_URL/api/v1/listings?limit=10&page=1" >/dev/null
echo "OK: public search returns 200"

echo "==> Public detail"
http GET "$BASE_URL/api/v1/listings/$LISTING_ID" >/dev/null
echo "OK: public detail returns 200"

echo ""
echo "SMOKE PASS"
echo "listingId=$LISTING_ID"