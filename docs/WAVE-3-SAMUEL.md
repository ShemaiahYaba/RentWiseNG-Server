# Wave 3 — Samuel hardening checklist

Parallel polish on Wave 1 modules while Shemaiah ships payments + admin config.

## Completed in this wave

| Module | Item |
| --- | --- |
| **user** | `GET/PATCH /users/me` return `{ user }` envelope |
| **kyc** | `POST /kyc` returns `{ submission }`; reject resubmit when `pending` or `approved` (409) |
| **reports** | `POST /reports` returns `{ report }`; `GET /reports/me` returns `{ reports }` |

## Deferred (not Wave 3)

- OI-010: conversation list sort by last message (Samuel, pre-WS)
- OI-003: report duplicate policy beyond `open` status

## Smoke

Re-run after Wave 3 deploy:

```bash
BASE_URL=http://localhost:3000 bash scripts/smoke-wave1-samuel.sh
```
