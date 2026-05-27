# Listings module

Owns property listings, photos, locations, and verification state.

## Routes (`/api/v1/listings`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | No | Search/filter **verified** listings (city, state, type, rent range) |
| GET | `/:id` | Optional Bearer | Public detail if verified; owners see own pending/rejected |
| POST | `/` | Bearer (agent, landlord) | Create listing (starts `pending`) |
| PATCH | `/:id` | Bearer (owner) | Update listing |
| DELETE | `/:id` | Bearer (owner) | Soft delete |

## Media uploads

Use `POST /api/v1/media/presign` (agent, landlord, admin) to get an R2 presigned URL, upload the file, then pass the returned `publicUrl` in `photoUrls` / `ownershipDocUrl` on create or update. Direct HTTPS URLs still work when R2 is not configured.

## Business rules

- **`kyc_required_for_listing`** (from `system_config`): blocks create until KYC is `approved`.
- **`max_active_listings_per_agent`**: agent listing cap (landlords uncapped).
- **`max_listing_photos`**: enforced on create/update.
- Public search only returns `verificationStatus = verified`.

## Verification status machine

`pending` → `verified` | `limited` | `rejected` (admin via `/admin/verification-queue/listings/:id`; logged in `listing_verification_logs`).
