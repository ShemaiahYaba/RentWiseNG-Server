# Wave 4 — Samuel reviews checklist

Post-payment reviews gated on released escrow.

## Completed in this wave

| Module | Item |
| --- | --- |
| **reviews** | `POST /reviews` — tenant-only, released payment, one per payment |
| **reviews** | `GET /reviews/listing/:id` — public list with reviewer summary |
| **reviews** | README gating rules + error codes |
| **smoke** | `scripts/smoke-reviews.sh` chains inspection → pay → release → review |

## Deferred (not Wave 4)

- Admin review moderation
- Soft-delete review API
- Listing aggregate rating
- DB partial unique on `payment_id`

## Smoke

```bash
pnpm exec tsc --noEmit
BASE_URL=http://localhost:3000 bash scripts/smoke-reviews.sh
```

After deploy:

```bash
BASE_URL=https://rentwiseng-server.onrender.com bash scripts/smoke-reviews.sh
```
