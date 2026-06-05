# Admin module

Owns verification queues, report moderation, full audit log, and system config. **Admin role only** (no self-register).

## Routes (`/api/v1/admin`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/verification-queue/listings` | Pending listings |
| PATCH | `/verification-queue/listings/:id` | Set verified \| limited \| rejected |
| GET | `/verification-queue/kyc` | Pending KYC |
| PATCH | `/verification-queue/kyc/:id` | Approve \| reject |
| GET | `/reports` | Open + under_review reports with reporter/target context |
| PATCH | `/reports/:id/status` | Moderate report (`under_review` \| `resolved` \| `dismissed`) |
| GET | `/config` | List `system_config` |
| PATCH | `/config/:key` | Update config value |
| GET | `/audit-logs` | Full audit log (Wave 5 — not implemented) |

Report status transitions: `open → under_review → resolved | dismissed`. Each change logs to `report_status_logs`.
