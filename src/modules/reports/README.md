# Reports module

Owns user-filed reports on listings or users (polymorphic target).

## Routes (`/api/v1/reports`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/` | Bearer | File a report |
| GET | `/me` | Bearer | Reporter's own reports |

## Polymorphic target

`target_type`: `listing` | `user`  
`target_id`: UUID of the listing or user row.

Admin moderation lives under `admin` module.

**Phase 2:** Implement create + status logs; admin queue.
