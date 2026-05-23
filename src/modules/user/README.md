# User module

Owns the authenticated user's profile.

## Routes (`/api/v1/users`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/me` | Bearer | Current user profile |
| PATCH | `/me` | Bearer | Update profile (Phase 2) |

**Phase 2:** Implement `user.repo` update logic and validation for phone change (re-verify).
