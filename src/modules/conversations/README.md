# Conversations module

Owns listing-scoped chat between tenants and agents/landlords.

## Routes (`/api/v1/conversations`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Bearer | List conversations |
| POST | `/` | Bearer | Start conversation on a listing |
| GET | `/:id/messages` | Bearer | Paginated message history |

## REST vs WebSocket

- **REST (this module):** conversation list, history, start thread.
- **WebSocket (Phase 2+):** real-time message delivery and read receipts.

**Phase 2:** WebSocket server, message send endpoint or socket events.
