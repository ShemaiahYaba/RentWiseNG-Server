# Listings module

Owns property listings, photos, locations, and verification state.

## Routes (`/api/v1/listings`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | No | Search/filter verified listings |
| GET | `/:id` | No | Listing detail |
| POST | `/` | Bearer (agent, landlord) | Create listing |
| PATCH | `/:id` | Bearer (owner) | Update listing |
| DELETE | `/:id` | Bearer (owner) | Soft delete |

## Verification status machine

`pending` → `verified` | `limited` | `rejected` (admin; logged in `listing_verification_logs`).

**Phase 2:** KYC gate, photo uploads, public search filters.
