# Payments module

Owns Paystack-initiated payments, escrow hold/release, and webhooks.

## Routes (`/api/v1/payments`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/initiate` | Bearer (tenant) | Start payment for inspection |
| POST | `/webhook` | HMAC (Paystack) | Internal webhook handler |
| POST | `/:id/release` | Bearer (tenant) | Confirm satisfaction → release |
| GET | `/me` | Bearer | User's payments |
| GET | `/:id` | Bearer | Payment detail |

## Payment flow

`initiated` → `processing` → `held` → `released` | `failed` | `refunded`

## Webhook notes

Verify `x-paystack-signature` with `PAYSTACK_WEBHOOK_SECRET` before updating status (Phase 2).

**Phase 2:** Paystack SDK, idempotency, `payment_status_logs`, auto-release cron.
