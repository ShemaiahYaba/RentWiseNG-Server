# Payments module

Owns Paystack-initiated payments, escrow hold/release, and webhooks.

## Routes (`/api/v1/payments`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/initiate` | Bearer (tenant) | Start payment for a completed inspection |
| POST | `/webhook` | Paystack HMAC | Mounted at app root before JSON parser |
| POST | `/:id/release` | Bearer (tenant) | Confirm satisfaction → `released` (DB only; no Paystack Transfer in MVP) |
| GET | `/me` | Bearer | Tenant payments + payments on owned listings |
| GET | `/:id` | Bearer | Payment detail (tenant, listing owner, admin) |

## Payment flow

```text
initiated → processing → held → released
              ↓
            failed
```

Every transition writes to `payment_status_logs` with `triggerSource`: `user` | `webhook` | `system`.

## Business rules

- Inspection must be `completed` and belong to the tenant.
- `amount` must match listing `rentAmount` (2 decimal places).
- One active payment per inspection (`initiated` | `processing` | `held`).
- Webhook verifies `x-paystack-signature` against raw body using `PAYSTACK_WEBHOOK_SECRET`.
- `charge.success` moves payment to `held` (via `processing` when needed).

## Environment

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Initialize transaction API |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook HMAC verification |
| `APP_URL` | Paystack callback URL base |

If either Paystack variable is missing, initiate and webhook return **503**.

## Webhook URL

Register in Paystack dashboard:

`https://<your-host>/api/v1/payments/webhook`

## MVP limitations

- **Release** updates database state only; Paystack payout/transfer is deferred (see `docs/OPEN-ISSUES.md`).
- **Auto-release** cron (`payment_release_window_hours` in `system_config`) is Wave 5+.
