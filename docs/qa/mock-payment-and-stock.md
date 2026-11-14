# Mock payment test mode and ingredient availability

## Run locally

1. Copy `.env.example` to `.env`. Use a distinct password, JWT_SECRET and PostgreSQL port for this project.
2. Run `docker compose up --build -d` and check `docker compose ps`.
3. Apply migrations (API does this at startup) and seed **only the Assignment2 database**:
   `docker compose exec api node apps/api/prisma/seed.mjs`.
4. Menu uses `NEXT_PUBLIC_MENU_DATA_SOURCE=api` and `NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=true` during the Docker web build.

## Mock payment outcome selector

To display **Thành công / Thất bại** controls in checkout for local demonstrations, set
`NEXT_PUBLIC_MOCK_PAYMENT_TEST_CONTROLS=true` in the root `.env` and rebuild
the web image with `docker compose up -d --build --no-deps web`.
Default is `false`, so a normal website does not expose this test-only control.

A failed attempt updates an order to `PAYMENT_FAILED` and keeps the cart. Retry retains
the same order idempotency key but creates a new payment attempt key, so
`PAYMENT_FAILED -> PAID` works with mock success. Never enable this control
against real payment processing; production outcome must come from provider verification.

## Ingredient-based availability

- `GET /api/products` includes `availableCups` for **size S without toppings**.
- `GET /api/products/:id/availability?sizeId=<uuid>&toppingIds=<uuid>,<uuid>` returns
  `availableCups` for the exact size and topping combination.
- For every ingredient, sum required quantity per cup across size and toppings; count
  is the **minimum** of `floor(ingredient.stock / required_per_cup)`.
- The UI shows an estimate only; existing `InventoryService.reserveStock()` verifies
  and reserves ingredients transactionally at order creation. Concurrent orders can
  reduce capacity between displaying the estimate and confirming checkout.
- Lack of recipe or stock reports an error instead of inventing a capacity.

## Checks

`npm ci`, `npm run db:generate`, `npm run lint`, `npm test`,
`npm run test:cart`, `npm run test:integration`,
`npm run build:api`, `npm run build:web`, followed by real Docker smoke testing.
