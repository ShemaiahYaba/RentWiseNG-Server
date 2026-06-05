#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/v1"
ADVANCE_DAYS="${ADVANCE_DAYS:-3}"

PASS=0
FAIL=0
SKIP=0

green() { echo -e "\033[32m✔ $1\033[0m"; }
red()   { echo -e "\033[31m✘ $1\033[0m"; }
yellow(){ echo -e "\033[33m⊘ $1\033[0m"; }
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

check_body() {
  local label="$1" expected="$2" body="$3"
  if echo "$body" | grep -qi "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    echo "  expected: $expected"
    echo "  body: $(echo "$body" | head -c 300)"
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

http_raw() {
  local url="$1" body="$2" signature="$3"
  local body_file
  body_file="$(mktemp)"
  local code
  code="$(curl -sS -o "$body_file" -w "%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "x-paystack-signature: $signature" \
    --data-binary "$body")"
  printf '%s' "$code"
  echo
  cat "$body_file"
  rm -f "$body_file"
}

valid_scheduled_date() {
  node -e "
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(process.argv[1]));
    process.stdout.write(d.toISOString().slice(0, 10));
  " "$ADVANCE_DAYS"
}

load_webhook_secret() {
  if [[ -n "${PAYSTACK_WEBHOOK_SECRET:-}" ]]; then
    return 0
  fi
  if [[ -f .env ]]; then
    PAYSTACK_WEBHOOK_SECRET="$(grep -E '^PAYSTACK_WEBHOOK_SECRET=' .env | cut -d= -f2- | tr -d '\r' || true)"
  fi
  [[ -n "${PAYSTACK_WEBHOOK_SECRET:-}" ]]
}

sign_webhook() {
  local payload="$1"
  node -e "
    const crypto = require('crypto');
    const secret = process.argv[1];
    const body = process.argv[2];
    const h = crypto.createHmac('sha512', secret).update(body).digest('hex');
    process.stdout.write(h);
  " "$PAYSTACK_WEBHOOK_SECRET" "$payload"
}

blue "Typecheck"
pnpm exec tsc --noEmit

blue "Seed"
pnpm seed >/dev/null

blue "Health"
health_out="$(http_json GET "$BASE_URL/health")"
check_status "GET /health" "200" "$(echo "$health_out" | head -n1)"

blue "Login tenant"
tenant_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}')"
check_status "Tenant login" "200" "$(echo "$tenant_out" | head -n1)"
TENANT_TOKEN="$(echo "$tenant_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"

blue "Login agent"
agent_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@rentwiseng.com","password":"Agent@1234"}')"
check_status "Agent login" "200" "$(echo "$agent_out" | head -n1)"
AGENT_TOKEN="$(echo "$agent_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"
AGENT_ID="$(http_json GET "$API/users/me" -H "Authorization: Bearer $AGENT_TOKEN" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.user?.id ?? "");
')"

blue "Pick verified listing"
listings_body="$(http_json GET "$API/listings?limit=20" | tail -n +2)"
LISTING_PICK="$(printf '%s' "$listings_body" | node -e "
  const o=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const agentId=process.argv[1];
  const pick=o?.data?.listings?.find(l=>l.ownerId===agentId)||o?.data?.listings?.[0];
  if(!pick) process.exit(2);
  process.stdout.write(JSON.stringify({ id: pick.id, rentAmount: pick.rentAmount }));
" "$AGENT_ID")"
LISTING_ID="$(printf '%s' "$LISTING_PICK" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).id)')"
RENT_AMOUNT="$(printf '%s' "$LISTING_PICK" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).rentAmount)')"
echo "  LISTING_ID=$LISTING_ID RENT_AMOUNT=$RENT_AMOUNT"

VALID_DATE="$(valid_scheduled_date)"

blue "Book + complete inspection"
book_body="$(http_json POST "$API/inspections" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"scheduledDate\":\"$VALID_DATE\",\"scheduledTime\":\"14:30\"}" | tail -n +2)"
INSPECTION_ID="$(printf '%s' "$book_body" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.inspection?.id??"")')"

http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' >/dev/null

http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' >/dev/null

echo "  INSPECTION_ID=$INSPECTION_ID"

blue "POST /payments/initiate"
init_out="$(http_json POST "$API/payments/initiate" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"inspectionId\":\"$INSPECTION_ID\",\"amount\":\"$RENT_AMOUNT\"}")"
init_code="$(echo "$init_out" | head -n1)"
init_body="$(echo "$init_out" | tail -n +2)"

if [[ "$init_code" == "503" ]]; then
  yellow "Paystack not configured — skipping webhook/release (set PAYSTACK_* in .env for full flow)"
  SKIP=$((SKIP + 1))
else
  check_status "POST /payments/initiate" "201" "$init_code"
  check_body "Payment status initiated" '"status":"initiated"' "$init_body"
  PAYMENT_ID="$(printf '%s' "$init_body" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.payment?.id??"")')"
  PAYSTACK_REF="$(printf '%s' "$init_body" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.payment?.paystackReference??"")')"
  echo "  PAYMENT_ID=$PAYMENT_ID REF=$PAYSTACK_REF"

  if load_webhook_secret; then
    blue "Simulate Paystack webhook (charge.success)"
    WEBHOOK_PAYLOAD="{\"event\":\"charge.success\",\"data\":{\"reference\":\"$PAYSTACK_REF\",\"status\":\"success\"}}"
    SIG="$(sign_webhook "$WEBHOOK_PAYLOAD")"
    hook_out="$(http_raw "$BASE_URL/api/v1/payments/webhook" "$WEBHOOK_PAYLOAD" "$SIG")"
    hook_code="$(echo "$hook_out" | head -n1)"
    hook_body="$(echo "$hook_out" | tail -n +2)"
    check_status "POST /payments/webhook" "200" "$hook_code"
    check_body "Webhook moves to held" "held" "$hook_body"

    blue "POST /payments/:id/release"
    rel_out="$(http_json POST "$API/payments/$PAYMENT_ID/release" \
      -H "Authorization: Bearer $TENANT_TOKEN")"
    check_status "POST release" "200" "$(echo "$rel_out" | head -n1)"
    check_body "Payment released" '"status":"released"' "$(echo "$rel_out" | tail -n +2)"
  else
    yellow "PAYSTACK_WEBHOOK_SECRET not set — skipping webhook/release simulation"
    SKIP=$((SKIP + 1))
  fi

  blue "GET /payments/me"
  me_out="$(http_json GET "$API/payments/me" -H "Authorization: Bearer $TENANT_TOKEN")"
  check_status "GET /payments/me" "200" "$(echo "$me_out" | head -n1)"
fi

blue "Wrong amount rejected (422)"
wrong_out="$(http_json POST "$API/payments/initiate" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"inspectionId\":\"$INSPECTION_ID\",\"amount\":\"1.00\"}")"
wrong_code="$(echo "$wrong_out" | head -n1)"
if [[ "$wrong_code" == "503" ]]; then
  yellow "Skip wrong-amount test (Paystack not configured)"
  SKIP=$((SKIP + 1))
else
  check_status "Wrong amount" "422" "$wrong_code"
fi

echo ""
echo "============================================="
echo "  Payments Smoke Test"
printf "  \033[32m✔ Passed: $PASS\033[0m\n"
printf "  \033[33m⊘ Skipped: $SKIP\033[0m\n"
if [[ "$FAIL" -gt 0 ]]; then
  printf "  \033[31m✘ Failed: $FAIL\033[0m\n"
fi
echo "============================================="

[[ "$FAIL" -eq 0 ]] || exit 1
echo "SMOKE PASS (payments)"
