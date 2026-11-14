# TV1 — Task 5.3 CI/CD technical handoff (14/11/2026)

## Implemented
- Reusable existing CI quality gate, with CD helper tests.
- `.github/workflows/cd.yml`: tag/manual trigger, Git SHA verification, Buildx linux/amd64, GHCR push API/Web, Render image-backed service deployments, production HTTPS smoke test, manual rollback via known-good SHA.
- `scripts/cd/render-deploy.mjs`: trigger pinned `imageUrl` via Render REST API, wait for live, fail on deploy/migration errors.
- `tests/smoke/production-smoke.mjs`: GET real health/products/order-authorization/menu URLs and fail on unexpected response.
- `scripts/cd/validation.mjs`, `tests/cd/validation.test.mjs`: immutable tag and HTTPS origin validation.
- Runtime API CORS origins configurable and Docker startup migration configurable, retaining Compose's default migration.

## Still needs explicit operator setup
- Render production PostgreSQL, API, and Web services.
- API pre-deploy migration (requires supported paid service), private DB, runtime env, CORS, registry image pull permission.
- GitHub Actions secrets/variables and protected production environment.
- First production image and real smoke result, previous known-good SHA, release notes.

Do not claim production deployment is complete until a Render release and live smoke have succeeded.
