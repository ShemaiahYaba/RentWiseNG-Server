#!/usr/bin/env bash

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
PASS=0
FAIL=0

# --- Helpers ---
green() { echo -e "\033[32m✔ $1\033[0m"; }
red()   { echo -e "\033[31m✘ $1\033[0m"; }
blue()  { echo -e "\033[34m\n▶ $1\033[0m"; }
dim()   { echo -e "\033[2m  $1\033[0m"; }

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    dim "expected to find: $expected"
    dim "got: $(echo "$actual" | head -c 300)"
    FAIL=$((FAIL + 1))
  fi
}

# =============================================================================
# SETUP — Login + grab IDs
# =============================================================================

blue "SETUP — Login as tenant"
TENANT_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}')
TENANT_TOKEN=$(echo "$TENANT_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
TENANT_ID=$(echo "$TENANT_RES" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.user?.id ?? "");
')

if [[ -z "$TENANT_TOKEN" ]]; then
  echo "ERROR: Tenant login failed. Is the server running and seeded?"
  exit 1
fi
echo "  TENANT_ID=$TENANT_ID"

blue "SETUP — Login as agent"
AGENT_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@rentwiseng.com","password":"Agent@1234"}')
AGENT_TOKEN=$(echo "$AGENT_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
AGENT_ID=$(echo "$AGENT_RES" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  process.stdout.write(o?.data?.user?.id ?? "");
')

if [[ -z "$AGENT_TOKEN" ]]; then
  echo "ERROR: Agent login failed."
  exit 1
fi
echo "  AGENT_ID=$AGENT_ID"

blue "SETUP — Login as landlord"
LANDLORD_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@rentwiseng.com","password":"Landlord@1234"}')
LANDLORD_TOKEN=$(echo "$LANDLORD_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [[ -z "$LANDLORD_TOKEN" ]]; then
  echo "ERROR: Landlord login failed."
  exit 1
fi

blue "SETUP — Get a verified listing ID"
LISTINGS_RES=$(curl -s "$BASE_URL/listings")
LISTING_ID=$(echo "$LISTINGS_RES" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const first = o?.data?.listings?.[0];
  process.stdout.write(first?.id ?? "");
')

if [[ -z "$LISTING_ID" ]]; then
  echo "ERROR: No verified listings found. Run pnpm seed first."
  exit 1
fi
echo "  LISTING_ID=$LISTING_ID"

# =============================================================================
# CONVERSATIONS
# =============================================================================

blue "CONV — Tenant starts conversation with agent on listing"
CONV_RES=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"participantId\":\"$AGENT_ID\"}")
check "POST /conversations returns 201 with conversation" "participantOne" "$CONV_RES"

CONV_ID=$(echo "$CONV_RES" | node -e '
  const o=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const id = o?.data?.conversation?.id;
  process.stdout.write(id ?? "");
')

if [[ -z "$CONV_ID" ]]; then
  red "Could not extract conversation ID — remaining conversation tests will fail"
  FAIL=$((FAIL + 1))
else
  dim "CONV_ID=$CONV_ID"
fi

blue "CONV — Idempotency: same request returns existing conversation"
CONV_IDEM=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"participantId\":\"$AGENT_ID\"}")
check "Duplicate POST /conversations returns existing conversation" "participantOne" "$CONV_IDEM"

blue "CONV — Cannot start conversation with yourself"
SELF_CONV=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"participantId\":\"$TENANT_ID\"}")
check "Self-conversation returns 400" "conversation with yourself" "$SELF_CONV"

blue "CONV — Cannot start conversation on non-existent listing"
FAKE_LISTING="00000000-0000-0000-0000-000000000000"
BAD_LISTING_CONV=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$FAKE_LISTING\",\"participantId\":\"$AGENT_ID\"}")
check "Non-existent listing returns 404" "Listing not found" "$BAD_LISTING_CONV"

blue "CONV — Unauthenticated cannot start conversation"
UNAUTH_CONV=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Content-Type: application/json" \
  -d "{\"listingId\":\"$LISTING_ID\",\"participantId\":\"$AGENT_ID\"}")
check "No token returns 401" "unauthorized" "$UNAUTH_CONV"

blue "CONV — Tenant lists their conversations"
LIST_CONV=$(curl -s "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TENANT_TOKEN")
check "GET /conversations returns conversations array" "conversations" "$LIST_CONV"

blue "CONV — Agent lists their conversations"
AGENT_LIST=$(curl -s "$BASE_URL/conversations" \
  -H "Authorization: Bearer $AGENT_TOKEN")
check "Agent GET /conversations returns conversations" "conversations" "$AGENT_LIST"

blue "CONV — Unauthenticated cannot list conversations"
UNAUTH_LIST=$(curl -s "$BASE_URL/conversations")
check "No token returns 401 on list" "unauthorized" "$UNAUTH_LIST"

# =============================================================================
# MESSAGES
# =============================================================================

blue "MSG — Tenant sends first message"
MSG1_RES=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hi, is this place still available?"}')
check "Tenant message returns 201 with content" "content" "$MSG1_RES"

blue "MSG — Agent replies"
MSG2_RES=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Yes, when would you like to inspect?"}')
check "Agent reply returns 201 with content" "content" "$MSG2_RES"

blue "MSG — Cannot send empty message"
EMPTY_MSG=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":""}')
check "Empty message content returns validation error" "Message cannot be empty" "$EMPTY_MSG"

blue "MSG — Cannot send message without content field"
NO_CONTENT=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
check "Missing content field returns validation error" "validation error" "$NO_CONTENT"

blue "MSG — Non-participant cannot send message"
LANDLORD_MSG=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Can I join this conversation?"}')
check "Non-participant send returns 403" "You are not a participant" "$LANDLORD_MSG"

blue "MSG — Unauthenticated cannot send message"
UNAUTH_MSG=$(curl -s -X POST "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"content":"Sneaky message"}')
check "No token returns 401 on send" "unauthorized" "$UNAUTH_MSG"

blue "MSG — Tenant gets message history"
HISTORY_RES=$(curl -s "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TENANT_TOKEN")
check "GET messages returns messages array" "messages" "$HISTORY_RES"
check "GET messages returns pagination" "pagination" "$HISTORY_RES"

blue "MSG — Pagination params respected"
PAGE_RES=$(curl -s "$BASE_URL/conversations/$CONV_ID/messages?page=1&limit=1" \
  -H "Authorization: Bearer $TENANT_TOKEN")
check "Paginated messages returns 1 message" "messages" "$PAGE_RES"
check "Paginated response includes totalPages" "limit" "$PAGE_RES"

blue "MSG — Non-participant cannot read messages"
LANDLORD_READ=$(curl -s "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $LANDLORD_TOKEN")
check "Non-participant read returns 403" "You are not a participant" "$LANDLORD_READ"

blue "MSG — Unauthenticated cannot read messages"
UNAUTH_READ=$(curl -s "$BASE_URL/conversations/$CONV_ID/messages")
check "No token returns 401 on read" "unauthorized" "$UNAUTH_READ"

blue "MSG — Non-existent conversation returns 404"
FAKE_CONV="00000000-0000-0000-0000-000000000000"
FAKE_CONV_RES=$(curl -s "$BASE_URL/conversations/$FAKE_CONV/messages" \
  -H "Authorization: Bearer $TENANT_TOKEN")
check "Non-existent conversation returns 404" "Conversation not found" "$FAKE_CONV_RES"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "============================================="
echo "  Conversations Smoke Test"
printf "  \033[32m✔ Passed: $PASS\033[0m\n"
if [ "$FAIL" -gt 0 ]; then
  printf "  \033[31m✘ Failed: $FAIL\033[0m\n"
else
  printf "  ✘ Failed: $FAIL\n"
fi
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi