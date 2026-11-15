# Mock payment test mode and ingredient availability

## Run locally

1. Copy `.env.example` to `.env`. Use a distinct password, JWT_SECRET and PostgreSQL port for this project.
2. Run `docker compose up --build -d` and check `docker compose ps`.
3. Apply migrations (API does this at startup) and seed **only the Assignment2 database**:
   `docker compose exec api node apps/api/prisma/seed.mjs`.
4. Menu uses `NEXT_PUBLIC_MENU_DATA_SOURCE=api` and `NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=true` during the Docker web build.

## Mock payment outcome selector

With API `PAYMENT_MODE=mock` and Web `NEXT_PUBLIC_PAYOS_ENABLED=false` (the defaults),
**Thành công / Thất bại** controls are available at checkout and on unpaid orders
in **Lịch sử đơn hàng** and order details. No extra test-control flag is needed.
After pulling this change, rebuild the Docker web image:
`docker compose up -d --build --no-deps web`.

- Choose **Thất bại** and confirm: the API records a failed attempt, updates the
  order to `PAYMENT_FAILED`, and keeps the cart.
- Open **Lịch sử đơn hàng**, choose **Thành công** for that order, and click
  **Thanh toán lại (mô phỏng)**: the API records a payment against the same
  order and the history shows **Đã thanh toán** (`PAID`).
- Each completed failure allows a fresh payment key on retry. If the result is
  unknown, check status before retrying; the UI does not assume payment succeeded.
- Outcome choices are hidden in PayOS mode. The mock API is available only when
  `PAYMENT_MODE=mock`; real payment outcomes still come from provider verification.

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
