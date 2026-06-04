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

- **REST (this module):** conversation list, history, start thread, send message.
- **WebSocket (later):** real-time message delivery and read receipts — see Wave 5 in `docs/MODULE-DEPENDENCIES.md`.

## Idempotency — `POST /conversations`

If a conversation already exists for the same `(listingId, participantOne, participantTwo)` pair, the existing conversation is returned with **200**. A new conversation returns **201**.

Only **verified** listings can be used to start a thread (same rule as public search).

## Known gaps (see `docs/OPEN-ISSUES.md`)

- List sorted by thread `createdAt`, not last message activity (OI-010).
