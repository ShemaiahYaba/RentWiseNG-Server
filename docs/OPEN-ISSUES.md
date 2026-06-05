# Open issues (post-MVP backlog)

Items here are **not blockers** for the current MVP ship. Fix when convenient; track progress in this table.

| ID     | Area           | Issue                                                                                    | Impact            | Suggested fix                                                                                  | Owner    |
| ------ | -------------- | ---------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- | -------- |
| OI-001 | seed           | [`src/db/seed.ts`](../src/db/seed.ts) inserts known dev credentials                      | Low (dev only)    | Document dev-only usage; guard with `NODE_ENV` or explicit `--force` flag later                | Shemaiah |
| OI-003 | reports        | Duplicate check only for `open` status                                                   | Low               | Optional time window / dedupe policy later                                                     | —        |
| OI-006 | kyc            | `document_number` stored as plain text                                                   | Medium (pre-prod) | Encryption helper before production                                                          | Shemaiah |
| OI-007 | deps           | Neon client pinned at `@neondatabase/serverless@0.10.2`                                  | Low               | Re-evaluate upgrade to 1.x after MVP stable                                                    | Shemaiah |
| OI-010 | conversations  | Conversation list sorted by thread `createdAt`, not last message activity                | Low UX            | Join latest message timestamp or defer until WebSocket port                                    | Samuel   |
| OI-016 | payments       | `POST /payments/:id/release` updates DB only; no Paystack Transfer/payout to landlord    | Medium (pre-prod) | Integrate Paystack Transfer API or document manual payout; `payment_release_window_hours` config exists for future cron | Shemaiah |

## Render / deploy notes

- **NODE_ENV on Render:** Set `NODE_ENV=production` in the Render service **Environment** dashboard. This cannot be enforced from application code alone if the platform injects a conflicting value. The [`Dockerfile`](../Dockerfile) already sets `ENV NODE_ENV=production` for container runs; align the Render dashboard so startup logs show `env: "production"`.

## How to use

1. Add new rows with the next `OI-###` id.
2. When fixed, move the row to **Resolved** below with PR link and date.

## Resolved

| ID     | Resolved | PR / notes |
| ------ | -------- | ---------- |
| OI-002 | 2026-06-04 | `listByReporter` now orders newest-first (`desc(createdAt)`) |
| OI-004 | 2026-06-04 | `kyc_status_logs` written on submit/resubmit in `kyc.service.ts` |
| OI-005 | 2026-06-04 | `getMe` unified via `userRepo` |
| OI-008 | 2026-06-04 | Messages response: `{ messages, pagination }` at top level of `data` |
| OI-009 | 2026-06-04 | `validate(messageQuerySchema, 'query')` on GET messages route |
| OI-011 | 2026-06-04 | Start conversation gated on `verificationStatus === 'verified'` |
| OI-012 | 2026-06-04 | `conversations/README.md` paths and REST/WS section cleaned up |
| OI-013 | 2026-06-04 | `app.set('trust proxy', 1)` before rate limiter |
| OI-014 | 2026-06-05 | Sentry ESM: `src/instrument.ts` + `--import` in start/dev/Dockerfile; init removed from `app.ts` |
| OI-015 | 2026-06-05 | Render `NODE_ENV=production` documented in deploy notes; Dockerfile sets `ENV NODE_ENV=production` |
| —      | 2026-06-04 | Build deploy: `@/` path alias resolved via `tsc-alias` in Docker build (was `ERR_MODULE_NOT_FOUND`) |
