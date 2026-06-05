# Reviews module

Owns post-rental reviews gated on released payments.

## Routes (`/api/v1/reviews`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/` | Bearer | Submit review (tenant who paid, one per payment) |
| GET | `/listing/:id` | No | Public reviews for a listing |

## Gating rules

| Rule | Behavior |
| --- | --- |
| **Who can POST** | Authenticated user must be `payment.tenantId` |
| **Payment gate** | `payment.status` must be `released` |
| **Consistency** | `body.listingId` must equal `payment.listingId` |
| **Dedupe** | One review per `paymentId` (active rows only) |
| **Listing** | Listing must exist and not be soft-deleted |

## Request example

```json
POST /api/v1/reviews
Authorization: Bearer <tenant-token>

{
  "listingId": "uuid",
  "paymentId": "uuid",
  "rating": 5,
  "comment": "Great place, smooth move-in."
}
```

## Response envelopes

- `POST /` → `201` with `data.review`
- `GET /listing/:id` → `200` with `data.reviews` (each includes `reviewer: { id, fullName }`)

## Error codes

| Code | When |
| --- | --- |
| **403** | Caller is not the tenant who made the payment |
| **404** | Payment, listing not found, or listing soft-deleted |
| **409** | Review already exists for this `paymentId` |
| **422** | Payment not `released`, or `listingId` does not match payment |

## Out of scope (this wave)

- Admin review moderation
- Soft-delete review API
- Listing aggregate rating
- Paystack / payment webhook changes
