# Wave 5 — Audit log, build, E2E smoke

## Scope

- `auditLogWrite()` helper with request-context IP/user-agent
- `GET /api/v1/audit-logs` — role-scoped read
- `GET /api/v1/admin/audit-logs` — full unscoped read (admin only)
- Audit writes wired into listings, inspections, payments, kyc, admin mutations
- `pnpm run build` clean
- E2E smoke: register → listing browse → inspect → pay → review → audit GETs

Out of scope this wave: WebSocket chat, Phone OTP SMS provider.

## Verification

```bash
pnpm run build
pnpm exec tsc --noEmit
BASE_URL=http://localhost:3000 bash scripts/smoke-e2e.sh
```

Start the dev server on port 3000 before running the smoke script:

```bash
pnpm dev
```

### Paystack (optional full payment path)

For webhook + release + review steps, set in `.env`:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`

Without these, the smoke script skips payment/review assertions but still validates audit log endpoints.

## Audit actions wired

| Module | Action |
| --- | --- |
| listings | `listing.created`, `listing.updated`, `listing.deleted` |
| inspections | `inspection.booked`, `inspection.status_changed` |
| payments | `payment.initiated`, `payment.released`, `payment.status_changed` (webhook, `actorRole: system`) |
| kyc | `kyc.submitted` |
| admin | `listing.verification_changed`, `kyc.decision`, `report.status_changed`, `config.updated` |

## Related scripts

- `scripts/smoke-payments.sh` — payments-only flow (seed tenant)
- `scripts/smoke-reviews.sh` — reviews after released payment
- `scripts/smoke-e2e.sh` — full tenant happy path with unique registration
