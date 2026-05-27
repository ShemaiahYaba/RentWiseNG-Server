# KYC module

Owns identity document submission and status for agents and landlords.

## Routes (`/api/v1/kyc`)

| Method | Path | Auth | Roles | Description |
| --- | --- | --- | --- | --- |
| POST | `/` | Bearer | agent, landlord | Submit KYC documents |
| GET | `/me` | Bearer | any | View own KYC status |

## Status machine

`pending` → `approved` | `rejected` (admin action via `/admin/verification-queue/kyc/:id`; transitions logged in `kyc_status_logs`).

## Document uploads

Submit HTTPS URLs in the request body, or use `POST /api/v1/media/presign` with `purpose: kyc_document` to upload to R2 first.

**Backlog:** encryption for `document_number` (see [OPEN-ISSUES.md](../../../docs/OPEN-ISSUES.md)).
