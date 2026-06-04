# RentWise API — Security starter (no repo required)

**Target:** staging API base URL over HTTPS (you will be given the host).

**Your tools:** Nmap, Wireshark, browser or curl/Postman — use your judgment.

**Rules:** staging only unless told otherwise. Do not run destructive tests or high-volume load. Do not post tokens, passwords, or screenshots with secrets in team chat.

---

## Seven tasks you can do now

1. **Nmap the host** — See which ports and services are exposed. Ideally only HTTPS (443) is open to the internet.

2. **Check TLS** — Valid certificate, HTTPS enforced, no obvious downgrade or mixed-content issues on any public pages tied to the API.

3. **Probe the API without logging in** — Try `/health`, `/api/v1/docs` (if it loads), and a few random paths. Note whether responses are consistent (404 vs 401) and whether errors leak stack traces or internal details.

4. **Wireshark one short session** — Capture traffic while calling the API over HTTPS. Confirm payloads are encrypted and that sensitive data (passwords, tokens) does not appear in URL query strings.

5. **Light abuse on auth-related endpoints** — If you discover login/register routes (e.g. via docs), send repeated bad requests. Check for rate limiting and safe, generic error messages.

6. **Security headers (quick check)** — Use browser dev tools or curl `-I` on the base URL. Note presence of headers like `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy` (if any). Missing headers are findings, not blockers by themselves.

7. **Write a short findings note** — For each issue: what you tried, what happened, severity (Low / Medium / High), and one-line recommendation. Send to the team lead; devs will fix and ask you to retest.

---

## How this ties to the project

RentWise is a rental platform API: auth, listings, KYC, reports, and admin verification queues. Your work here validates **exposure and basic hardening** before deeper access-control tests (with test accounts) later.

**Questions?** Ask Shemaiah (backend / infra).
