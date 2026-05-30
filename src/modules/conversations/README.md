# Conversations module

Owns listing-scoped chat between tenants and agents/landlords.

## Routes (`/api/v1/conversations`)

| Method | Path            | Auth   | Description                      |
| ------ | --------------- | ------ | -------------------------------- |
| GET    | `/`             | Bearer | List conversations               |
| POST   | `/`             | Bearer | Start conversation on a listing  |
| GET    | `/:id/messages` | Bearer | Paginated message history        |
| POST   | `/:id/messages` | Bearer | Send a message in a conversation |

## REST vs WebSocket

- **REST (this module):** conversation list, history, start thread, send Message.

- **WebSocket (Phase 2+):** real-time message delivery and read receipts.

## Idempotency - POST /conversation

If a conversation already exists for the same `(listingId, participantOne, participantTwo)` pair, the existing conversation is returned with 200. A new conversation returns 201.

**Phase 2:** WebSocket server, message send endpoint or socket events.
