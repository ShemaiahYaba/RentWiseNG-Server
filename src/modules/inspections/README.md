# Inspections module

Owns tenant inspection bookings and listing-owner confirmations. Wave 3 payments depend on inspections reaching `completed`.

## Routes (`/api/v1/inspections`)

| Method | Path | Auth | Roles | Description |
| --- | --- | --- | --- | --- |
| POST | `/` | Bearer | tenant | Book inspection |
| GET | `/me` | Bearer | any | List inspections where user is tenant or listing owner |
| GET | `/:id` | Bearer | tenant, listing owner, admin | Inspection detail |
| PATCH | `/:id/status` | Bearer | agent, landlord | Confirm, cancel, or complete (listing owner only) |

## Booking rules

- Listing must exist, not be deleted, and have `verificationStatus === 'verified'`.
- `scheduledDate` must be at least `inspection_advance_booking_days` ahead (from `system_config`, default 3).
- `scheduledTime` is `HH:MM` (24-hour); stored as `HH:MM:00`.
- One active booking per tenant+listing: rejects if `pending` or `confirmed` already exists (409).

## Access control

| Action | Who |
| --- | --- |
| Book | Tenant only |
| GET `/:id` | Tenant on the booking, listing owner, or admin |
| GET `/me` | Rows where user is tenant or owns the listing |
| PATCH status | Listing owner only (`listing.ownerId === userId`) |

## Status machine

```text
pending → confirmed | cancelled
confirmed → completed | cancelled
```

Every transition is logged in `inspection_status_logs`, including initial book (`none → pending`).

`completed` is required before Wave 3 payment initiation.

## Response envelope

- `POST /` → `201` `{ inspection }`
- `GET /:id` → `200` `{ inspection }`
- `GET /me` → `200` `{ inspections }`
- `PATCH /:id/status` → `200` `{ inspection }`
