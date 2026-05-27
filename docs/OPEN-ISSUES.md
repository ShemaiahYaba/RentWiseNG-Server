# Open issues (post-MVP backlog)

Items here are **not blockers** for the current MVP ship. Fix when convenient; track progress in this table.

| ID | Area | Issue | Impact | Suggested fix | Owner |
| --- | --- | --- | --- | --- | --- |
| OI-001 | seed | [`src/db/seed.ts`](../src/db/seed.ts) inserts known dev credentials | Low (dev only) | Document dev-only usage; guard with `NODE_ENV` or explicit `--force` flag later | Shemaiah |
| OI-002 | reports | `listByReporter` orders oldest-first | Low UX | Use `orderBy(desc(reports.createdAt))` | Samuel |
| OI-003 | reports | Duplicate check only for `open` status | Low | Optional time window / dedupe policy later | — |
| OI-004 | kyc | No `kyc_status_logs` row on submit | Low | Add log on submit or wire when admin module lands | Shemaiah |
| OI-005 | user | `getMe` uses `authRepo`, `updateMe` uses `userRepo` | Low | Unify via `userRepo` when convenient | Samuel |
| OI-006 | kyc | `document_number` stored as plain text | Medium (pre-prod) | Encryption helper before production | Shemaiah |
| OI-007 | deps | Neon client pinned at `@neondatabase/serverless@0.10.2` | Low | Re-evaluate upgrade to 1.x after MVP stable | Shemaiah |

## How to use

1. Add new rows with the next `OI-###` id.
2. When fixed, move the row to **Resolved** below with PR link and date.

## Resolved

| ID | Resolved | PR / notes |
| --- | --- | --- |
| — | — | — |
