# Deploy RentWise API on Render (Docker)

Production runs from the repo [`Dockerfile`](../Dockerfile) with database migrations applied before each deploy via `preDeployCommand` in [`render.yaml`](../render.yaml). Postgres stays on **Neon**. **Use the [Render Dashboard](https://dashboard.render.com) for deploys, env vars, and logs** — the CLI is optional.

## Prerequisites

- [Render](https://render.com) account
- This repo on GitHub or GitLab (connected to Render)
- Neon connection string for `DATABASE_URL`

## First deploy (Dashboard)

### Option A — Blueprint (recommended)

Uses [`render.yaml`](../render.yaml) in the repo.

1. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the **Rentwise-Server** repository and branch (e.g. `main`).
3. Review the service (`rentwise-api`, Docker runtime) → **Deploy Blueprint**.
4. When prompted, enter values for variables marked `sync: false` (secrets are not stored in git).
5. Wait for the build and pre-deploy migrate step to finish.
6. Open the service → copy the public URL (e.g. `https://rentwise-api.onrender.com`).
7. **Environment** → set **`APP_URL`** to that URL (not `http://localhost:3000`) → **Save and deploy**.

### Option B — Single web service (no Blueprint)

1. **New** → **Web Service** → connect the repo.
2. **Language:** **Docker** (not Node).
3. **Dockerfile path:** `./Dockerfile` (repo root).
4. **Health check path:** `/health`
5. **Pre-deploy command:** `pnpm run migrate`
6. **Environment** → add variables (see below) or **Add from .env**.
7. **Create Web Service** / deploy.

## Environment variables (Dashboard)

**Environment** tab on your service.

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` (Blueprint sets this; confirm if using Option B) |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | At least 32 characters |
| `APP_URL` | Public API URL after first deploy |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins for CORS |

Optional: Google OAuth, Sentry, R2, Paystack — see [`.env.example`](../.env.example).

**Bulk import:** **Add from .env** uploads a local `.env` file. Before uploading:

- Use **`NODE_ENV=production`**, not `development`.
- Set **`APP_URL`** to your Render URL, not localhost.
- **Do not** set `PORT` — Render injects it.
- Remove empty placeholder lines.

Render never reads your local `.env` at deploy time unless you paste/upload it in the dashboard.

## Later deploys (Dashboard)

With **Auto-Deploy** enabled (default for Git-backed services):

- Push to the linked branch → Render builds the Dockerfile and deploys automatically.

**Manual deploy:**

1. Open the service in the dashboard.
2. **Manual Deploy** → **Deploy latest commit** (or pick a commit).

**Redeploy without a new build** (env-only change):

- **Environment** → edit vars → **Save and deploy** (reuses last image with new env).

## Logs and debugging (Dashboard)

- Service → **Logs** (build, pre-deploy, runtime).
- **Events** / **Deploys** for failed migrate or Docker build steps.

Common issues:

- **Pre-deploy failed:** `pnpm run migrate` — check `DATABASE_URL` and `src/db/migrations/`.
- **Runtime exit:** DB unreachable in production — verify Neon connectivity from Render.
- **Build failed:** open the Docker build log for the failing stage.

## Migrations

`preDeployCommand: pnpm run migrate` in `render.yaml` runs before traffic switches to the new version. Failed migrations block the deploy.

## Health check

Path: `/health` — expect HTTP 200 and `{ "status": "success", ... }`.

## Local Docker smoke test

```bash
docker build -t rentwise-api .
docker run --env-file .env -p 3000:3000 rentwise-api
curl http://localhost:3000/health
```

---

## Optional: Render CLI

Not required for dashboard workflows. Useful for `render blueprints validate render.yaml` or scripting deploys in CI.

Install (Windows Git Bash example, `C:\dev\bin`):

```bash
VERSION=2.19.0
INSTALL_DIR="/c/dev/bin"
mkdir -p "$INSTALL_DIR"
curl -fsSL -o /tmp/render-cli.zip \
  "https://github.com/render-oss/cli/releases/download/v${VERSION}/cli_${VERSION}_windows_amd64.zip"
TMP=$(mktemp -d)
unzip -o /tmp/render-cli.zip -d "$TMP"
cp "$TMP/cli_v${VERSION}.exe" "$INSTALL_DIR/render.exe"
export PATH="/c/dev/bin:$PATH"
render --version
```

See [Render CLI docs](https://render.com/docs/cli). The official CLI cannot bulk-sync `.env` to an existing service; use the dashboard **Add from .env** instead.
