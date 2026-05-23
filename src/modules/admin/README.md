# Admin module

Owns verification queues, report moderation, full audit log, and system config. **Admin role only** (no self-register).

## Routes (`/api/v1/admin`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/verification-queue/listings` | Pending listings |
| PATCH | `/verification-queue/listings/:id` | Set verified \| limited \| rejected |
| GET | `/verification-queue/kyc` | Pending KYC |
| PATCH | `/verification-queue/kyc/:id` | Approve \| reject |
| GET | `/reports` | Open / under_review reports |
| PATCH | `/reports/:id/status` | Moderate report |
| GET | `/audit-logs` | Full audit log |
| GET | `/config` | List `system_config` |
| PATCH | `/config/:key` | Update config value |

**Phase 2:** Implement all handlers, state log writes, and seed `system_config` defaults from pitch doc.
