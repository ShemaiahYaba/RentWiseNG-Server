# KYC module

Owns identity document submission and status for agents and landlords.

## Routes (`/api/v1/kyc`)

| Method | Path | Auth | Roles | Description |
| --- | --- | --- | --- | --- |
| POST | `/` | Bearer | agent, landlord | Submit KYC documents |
| GET | `/me` | Bearer | any | View own KYC status |

## Status machine

`pending` → `approved` | `rejected` (admin action; transitions logged in `kyc_status_logs`).

**Phase 2:** R2 upload integration, encryption for `document_number`, admin queue wiring.
