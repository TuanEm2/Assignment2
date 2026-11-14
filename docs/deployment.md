# BrewLite Assignment 2 — CI/CD Production (Task 5.3)

## Architecture and safety contract

Release flow:
`Git tag v* / manual dispatch → reusable CI quality gate → Docker Buildx (linux/amd64) → GHCR immutable commit SHA images → protected GitHub Actions environment → Render API service deploy (Prisma pre-deploy migration) → Render Web deploy → real HTTPS smoke checks`.

- Images: `ghcr.io/tuanem2/assignment2-api:<40-hex-git-sha>` and `ghcr.io/tuanem2/assignment2-web:<40-hex-git-sha>`.
- **Do not deploy an image tagged `latest`.** Retain previous image versions for rollback.
- Docker Compose remains the local development deployment, and runs migrations at API startup by default.
- Production requires two **image-backed Render Web Services** (API and Web) and a **private Render PostgreSQL** instance. Do **not** expose the database publicly.
- Migration command must run in Render's **API Pre-Deploy Command**: `npm run db:migrate`. Set `RUN_MIGRATIONS_ON_STARTUP=false` on the production API service after the pre-deploy is configured and verified. This prevents a second/multiple concurrent migration from running on the live app.
- **Render Pre-Deploy is available for paid web services/private services/workers**. If the available service plan does not support it, do not set `RENDER_PREDEPLOY_READY=true`; use a supported plan or design/test a separate one-off migration job before enabling CD.
- **CD does not automatically undo a database migration.** Only run backward-compatible migrations on rollout; keep a restore-tested backup before high-risk changes.

## One-time Render provisioning

1. Create a Render PostgreSQL instance and keep it private. Copy the **internal** PostgreSQL URL into the API service's `DATABASE_URL` secret.
2. Bootstrap GHCR images first using the release workflow (the deploy job will intentionally stop if no Render services are configured), or push initial images manually. Then create Render services from those tags.\n3. Create a Render image-backed API service using the GHCR repository `ghcr.io/tuanem2/assignment2-api` and an available existing SHA tag. Render's default image host/repository/name must match GitHub Actions' `imageUrl`.
4. Set API runtime `NODE_ENV=production`, `PORT=4000`, `DATABASE_URL=<internal-postgres-connection>`, `JWT_SECRET=<random-32-byte-plus-secret>`, `PAYMENT_MODE=mock`, `RUN_MIGRATIONS_ON_STARTUP=false`, `CORS_ORIGINS=https://<frontend-onrender-domain>`. Configure **Pre-Deploy Command** `npm run db:migrate`, **Health Check Path** `/api/health`. Do not commit these secrets.
5. Create a Render image-backed Web service using `ghcr.io/tuanem2/assignment2-web`. The web image embeds `NEXT_PUBLIC_API_URL` at build time; the workflow builds with your public HTTPS API URL. Web runs on `PORT=3000`.
6. Enable GHCR package visibility for Render to pull, or register GHCR registry credentials on both Render services. The `GITHUB_TOKEN` used to push an image from Actions does not grant Render pull access by itself.
7. Disable Render's independent auto-deploy for these image-backed services (release is controlled by the GitHub CD workflow).
8. On the initial production database, run migrations through the API service's Pre-Deploy Command; seed the sample catalog **once**, deliberately, on production if your demo requires it. **Never** run automatic destructive reset/seed after each deploy. Keep `NEXT_PUBLIC_MOCK_PAYMENT_TEST_CONTROLS=false`.

**Important:** Production uses mock payment only as specified for the assignment, not real money. The success/failure selector UI must stay disabled on publicly reachable production.

## GitHub repository configuration

Go to GitHub → Settings → Secrets and variables → Actions.

Repository-level **Variables** (especially `PRODUCTION_API_URL`, which is needed before the deploy environment opens):

| Name | Example | Notes |
| --- | --- | --- |
| `PRODUCTION_API_URL` | `https://brewlite-api.onrender.com` | HTTPS origin; **used while building Web image** |
| `PRODUCTION_WEB_URL` | `https://brewlite-web.onrender.com` | Used by live smoke |
| `RENDER_API_SERVICE_ID` | `srv-...api...` | Actual Render service ID, not a placeholder |
| `RENDER_WEB_SERVICE_ID` | `srv-...web...` | Actual Render service ID |
| `RENDER_PREDEPLOY_READY` | `true` | **Only** set after verifying pre-deploy command, database backup, and private DB |

Variables used only during deployment may alternatively be configured under the protected `production` environment; `PRODUCTION_API_URL` MUST be a repository variable.\n\nActions / production environment **Secret**: `RENDER_API_KEY` (Render API token with permission to deploy both services).

Create GitHub **Environment: production** with required reviewers if available. Limit who can trigger releases. Enforce branch protection on `main`. GHCR publishing is performed by `GITHUB_TOKEN` with `packages:write`; no GHCR personal access token is needed for the push.

**Caution:** The GitHub API service and Web service **MUST** already exist on Render and share correct image repository names; this workflow deploys to existing services, it does not create new billable services or databases.

## Release / deploy

1. Merge a reviewed PR to `main` after the CI workflow is green.
2. Create a version tag `v1.0.0` on the **verified main commit** and push it; or manually run the **BrewLite CD** workflow on `main`, selecting `release`.
3. CD reruns CI, confirms commit is on `main`, builds tagged API + Web images for `linux/amd64`, pushes GHCR, checks the production environment gates, deploys API then Web using the exact SHA images, waits until Render marks each deployment `live`, and calls live smoke.
4. Record the SHA, tag, CI/CD run URL, deployed image digests, API/Web URLs, migration log, and screenshots in release notes.

Quick commands from a local main checkout:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git tag -a v1.0.0 -m "BrewLite Assignment 2 release 1.0.0"
git push origin v1.0.0
```

Use a fresh tag for each release; do not move an already-published tag.

## Production smoke tests

```bash
API_BASE_URL=https://YOUR-REAL-API.onrender.com \
WEB_BASE_URL=https://YOUR-REAL-WEB.onrender.com \
npm run test:smoke:live
```

The script actually calls the deployed HTTPS URLs and checks: `/api/health` response contract; `/api/products` JSON array; `/api/orders/me` returns HTTP 401 without JWT; `/menu` displays BrewLite. It retries transient startup failures; failures cause the CD job to fail. Do not confuse this with the earlier **static** `npm run test:smoke`, which checks local files/configs and uses synthetic objects.

This smoke suite does not prove full E2E checkout; TV6 must still execute a real browser/API-to-PostgreSQL checkout E2E and retain evidence.

## Rollback: app vs. database

### Before a release
1. Preserve the last known **working full SHA**, its API and Web GHCR image tags/digests, and the Render deploy IDs.
2. Confirm the production DB has a tested backup/restore procedure. Review migrations for backward compatibility with the previous app.
3. Confirm both old images remain in GHCR and can be pulled by Render.

### If deployment or live smoke fails
1. Do **not** move a broken release tag, delete volumes or run `prisma migrate reset`.
2. Inspect GitHub CD job / Render deploy and pre-deploy logs. If a migration failed, stop and repair the schema/migration safely; do not blindly revert SQL.
3. If older app is compatible with the current DB, open GitHub Actions → **BrewLite CD** → Run workflow on `main` → operation `rollback` → paste the **full previously working 40-character SHA** into `rollback_sha`.
4. The workflow verifies the rollback SHA is on `main`, reuses existing immutable GHCR images (**no rebuild**), deploys API and Web, and reruns live smoke.
5. Verify order/payment/history integrity, user sign-in, basic checkout, and logs. Record incident, root cause, affected release, rollback SHA and outcomes.

**If the database was changed incompatibly**, do not perform app rollback until DB recovery has been planned; prefer forward-fixing compatible migrations. Database recovery from a backup may lose later writes; obtain explicit approval and document recovery point.

### Limitations and follow-up
- The deploy gate uses `RENDER_PREDEPLOY_READY` as an operator attestation; it does not automatically audit the Render service's settings. Confirm that API pre-deploy is configured before setting it.
- Render paid web service is needed for pre-deploy; do not misrepresent local migration as production migration.
- GitHub Actions environment protection may depend on repository settings/plan.
- Production E2E, monitoring/alerting and post-release release notes remain additional delivery requirements.
- No actual production service or secret is provisioned by committing these files.
