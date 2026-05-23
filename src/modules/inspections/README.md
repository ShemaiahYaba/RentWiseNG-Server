# Inspections module

Owns tenant inspection bookings and owner confirmations.

## Routes (`/api/v1/inspections`)

| Method | Path | Auth | Roles | Description |
| --- | --- | --- | --- | --- |
| POST | `/` | Bearer | tenant | Book inspection |
| GET | `/me` | Bearer | any | List user's inspections |
| GET | `/:id` | Bearer | any | Inspection detail |
| PATCH | `/:id/status` | Bearer | agent, landlord | Confirm/cancel/complete |

## Status machine

`pending` → `confirmed` → `completed` | `cancelled` (logged in `inspection_status_logs`).

**Phase 2:** Advance booking rules from `system_config`, notifications.
