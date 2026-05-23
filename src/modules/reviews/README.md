# Reviews module

Owns post-rental reviews gated on completed payments.

## Routes (`/api/v1/reviews`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/` | Bearer | Submit review (requires `payment_id` with released payment) |
| GET | `/listing/:id` | No | Reviews for a listing |

## Gating rule

Reviews require a `payments` row in `released` status linked via `payment_id`.

**Phase 2:** Enforce gate in service, dedupe one review per payment.
