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

RUN_ID="$(date +%s)"
E2E_EMAIL="e2e+${RUN_ID}@example.com"
E2E_PHONE="+23480${RUN_ID: -8}"

blue "Typecheck"
pnpm exec tsc --noEmit

blue "Seed"
pnpm seed >/dev/null

blue "Health"
health_out="$(http_json GET "$BASE_URL/health")"
check_status "GET /health" "200" "$(echo "$health_out" | head -n1)"

blue "Register unique tenant"
register_out="$(http_json POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"tenant\",\"fullName\":\"E2E Tenant\",\"email\":\"$E2E_EMAIL\",\"phone\":\"$E2E_PHONE\",\"password\":\"Tenant@1234\"}")"
check_status "POST /auth/register" "201" "$(echo "$register_out" | head -n1)"
TENANT_TOKEN="$(echo "$register_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"
echo "  E2E_EMAIL=$E2E_EMAIL"

blue "Login agent (seed)"
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
book_out="$(http_json POST "$API/inspections" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"scheduledDate\":\"$VALID_DATE\",\"scheduledTime\":\"14:30\"}")"
check_status "POST /inspections" "201" "$(echo "$book_out" | head -n1)"
INSPECTION_ID="$(echo "$book_out" | tail -n +2 | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.inspection?.id??"")')"

http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' >/dev/null

http_json PATCH "$API/inspections/$INSPECTION_ID/status" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' >/dev/null
echo "  INSPECTION_ID=$INSPECTION_ID"

RELEASED=0

blue "POST /payments/initiate"
init_out="$(http_json POST "$API/payments/initiate" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"inspectionId\":\"$INSPECTION_ID\",\"amount\":\"$RENT_AMOUNT\"}")"
init_code="$(echo "$init_out" | head -n1)"
init_body="$(echo "$init_out" | tail -n +2)"

if [[ "$init_code" == "503" ]]; then
  yellow "Paystack not configured — skipping payment/review/audit payment assertions"
  SKIP=$((SKIP + 1))
else
  check_status "POST /payments/initiate" "201" "$init_code"
  PAYMENT_ID="$(printf '%s' "$init_body" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.payment?.id??"")')"
  PAYSTACK_REF="$(printf '%s' "$init_body" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8"))?.data?.payment?.paystackReference??"")')"
  echo "  PAYMENT_ID=$PAYMENT_ID REF=$PAYSTACK_REF"

  if load_webhook_secret; then
    blue "Simulate Paystack webhook (charge.success)"
    WEBHOOK_PAYLOAD="{\"event\":\"charge.success\",\"data\":{\"reference\":\"$PAYSTACK_REF\",\"status\":\"success\"}}"
    SIG="$(sign_webhook "$WEBHOOK_PAYLOAD")"
    hook_out="$(http_raw "$BASE_URL/api/v1/payments/webhook" "$WEBHOOK_PAYLOAD" "$SIG")"
    check_status "POST /payments/webhook" "200" "$(echo "$hook_out" | head -n1)"

    blue "POST /payments/:id/release"
    rel_out="$(http_json POST "$API/payments/$PAYMENT_ID/release" \
      -H "Authorization: Bearer $TENANT_TOKEN")"
    check_status "POST release" "200" "$(echo "$rel_out" | head -n1)"
    check_body "Payment released" '"status":"released"' "$(echo "$rel_out" | tail -n +2)"
    RELEASED=1
  else
    yellow "PAYSTACK_WEBHOOK_SECRET not set — skipping webhook/release/review"
    SKIP=$((SKIP + 1))
  fi
fi

if [[ "$RELEASED" -eq 1 ]]; then
  blue "POST /reviews"
  review_payload="{\"listingId\":\"$LISTING_ID\",\"paymentId\":\"$PAYMENT_ID\",\"rating\":5,\"comment\":\"E2E smoke review.\"}"
  create_out="$(http_json POST "$API/reviews" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$review_payload")"
  check_status "POST /reviews" "201" "$(echo "$create_out" | head -n1)"

  blue "GET /reviews/listing/:id"
  list_out="$(http_json GET "$API/reviews/listing/$LISTING_ID")"
  check_status "GET /reviews/listing/:id" "200" "$(echo "$list_out" | head -n1)"
  check_body "List includes E2E review" "E2E smoke review." "$(echo "$list_out" | tail -n +2)"
fi

blue "GET /audit-logs (tenant scoped)"
audit_out="$(http_json GET "$API/audit-logs" -H "Authorization: Bearer $TENANT_TOKEN")"
check_status "GET /audit-logs" "200" "$(echo "$audit_out" | head -n1)"
audit_body="$(echo "$audit_out" | tail -n +2)"
audit_count="$(printf '%s' "$audit_body" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const n=o?.data?.auditLogs?.length ?? 0;
  process.stdout.write(String(n));
')"
if [[ "$audit_count" -ge 1 ]]; then
  green "Tenant audit log has entries ($audit_count)"
  PASS=$((PASS + 1))
else
  red "Tenant audit log empty — expected >= 1 entry"
  FAIL=$((FAIL + 1))
fi

blue "Login admin + GET /admin/audit-logs"
admin_out="$(http_json POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentwiseng.com","password":"Admin@1234"}')"
check_status "Admin login" "200" "$(echo "$admin_out" | head -n1)"
ADMIN_TOKEN="$(echo "$admin_out" | tail -n +2 | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.accessToken ?? "");
')"

admin_audit_out="$(http_json GET "$API/admin/audit-logs" -H "Authorization: Bearer $ADMIN_TOKEN")"
check_status "GET /admin/audit-logs" "200" "$(echo "$admin_audit_out" | head -n1)"
check_body "Admin audit response shape" '"auditLogs"' "$(echo "$admin_audit_out" | tail -n +2)"

echo ""
echo "============================================="
echo "  E2E Smoke Test (Wave 5)"
printf "  \033[32m✔ Passed: $PASS\033[0m\n"
printf "  \033[33m⊘ Skipped: $SKIP\033[0m\n"
if [[ "$FAIL" -gt 0 ]]; then
  printf "  \033[31m✘ Failed: $FAIL\033[0m\n"
fi
echo "============================================="

[[ "$FAIL" -eq 0 ]] || exit 1
echo "SMOKE PASS (e2e)"
