# Assignment 2: PayOS VietQR (real money) and production deployment

> **Not yet deployed.** These source changes do not create a merchant account, transfer funds, or provision new production services. Existing Render services in this workspace belong to **Assignment 1**; NEVER overwrite them to deploy Assignment 2.

## Merchant prerequisites

- An eligible, verified PayOS merchant account and payment channel. Complete account eligibility / identity checks via the official PayOS process. Use the merchant's authorized account; never attempt to bypass verification.
- Merchant secrets kept exclusively in Render **environment secrets**, NOT in GitHub, the repository, documents or ChatGPT messages:
  - `PAYOS_CLIENT_ID`
  - `PAYOS_API_KEY`
  - `PAYOS_CHECKSUM_KEY`
- Verified merchant bank account for receiving legitimate payments; check recipient name/amount on hosted PayOS page before using real money.
- Choose the official PayOS hosted checkout page, not a self-made QR containing an unverified bank account.

Official docs: https://payos.vn/docs/sdks/back-end/node/ ; https://payos.vn/docs/du-lieu-tra-ve/webhook/ .

## Separate Render production for Ass2

1. Create **NEW** Render PostgreSQL, API Web Service, and Frontend Web Service for `https://github.com/TuanEm2/Assignment2` in region Singapore. Do NOT edit the existing `brewlite-tv1-*` Ass1 services or DB.
2. Before enabling PayOS, get the separate Ass2 stack healthy with `PAYMENT_MODE=mock`, `PAYOS_ENABLED=false`. Configure internal DATABASE_URL, strong random JWT_SECRET, CORS_ORIGINS, logging, migration and seed. Test API health, catalog, auth and order checkout.
3. Node/Docker API uses `apps/api/Dockerfile`; Web uses `apps/web/Dockerfile`. Web public API URL is a **build-time** Next.js variable. Configure `NEXT_PUBLIC_API_URL` to Ass2's public HTTPS API origin.
4. Render Free PostgreSQL expires after 30 days; Render Free Web sleeps. These are unsuitable for a reliable real-money production service. Choose a suitable supported plan through an authorized account holder, and arrange backups before enabling live payments. Render Pre-Deploy for Prisma migration is on supported paid services. Avoid creating paid resources without explicit account-holder approval.
5. Set API env `PAYMENT_MODE=payos`, `PAYOS_ENABLED=true`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `WEB_PUBLIC_URL=https://<ASS2-WEB>.onrender.com`. Also configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` and `RUN_MIGRATIONS_ON_STARTUP=false` **only after** API's Pre-Deploy command `npm run db:migrate` is configured. Do not enable mock payments on the live service.
6. Set Web build env / Docker build arg `NEXT_PUBLIC_PAYOS_ENABLED=true` and rebuild Web. The existing GitHub CD workflow reads repository variable `PAYOS_FRONTEND_ENABLED`, which should be `true` only after PayOS and Ass2 production are fully configured.
7. In the official PayOS merchant dashboard, configure the webhook **`https://<ASS2-API>.onrender.com/api/payments/payos/webhook`**. The webhook is public but verifies HMAC-SHA256 with the Checksum Key; it must not be protected by JWT.
8. Test with **authorized transactions only**; verify signed webhook leads to one Payment / PaymentAttempt / `PAID` update. Test duplicates, mismatched amount, invalid signature, abandoned checkout and customer refresh. Review proper refunds and cancellations before real-world use.

## Functional flow

- Customer selects items and uses Checkout → "Thanh toán QR PayOS"; page first calls `POST /api/orders` with a stable idempotency key.
- It then calls authenticated `POST /api/payments/payos/checkout` with **only** `{ "orderId": "<uuid>" }`. Backend reads ownership + total from PostgreSQL; stores a unique link record; signs outgoing payment link request; returns a PayOS-hosted HTTPS checkout URL.
- Customer is redirected to PayOS's QR payment page. No client-supplied `amount`, `outcome` or bank account is accepted.
- PayOS sends signed `POST /api/payments/payos/webhook` to API. Backend checks signature, link ID if available, amount, currency, status, order ID, and uniqueness, then stores a single Payment and changes order status `PAID` in a transaction.
- Browser returns to `/payment-result?orderId=...`; this page queries `GET /api/payments/payos/status/:orderId` with JWT and **never trusts return URL query fields as a payment confirmation**. It clears the cart only when backend reports the confirmed payment.

## Failure, safety and reconciliation limits

- A provider timeout after PayOS has created a link can leave a local record in `REQUESTED`. The server intentionally **does not create another link automatically**, preventing double payment; operator must reconcile against the merchant dashboard, then correct the record as appropriate.
- If webhook arrives late, user must wait/refresh status. Keep cart until `PAID`; do not send a second transfer.
- Signed webhooks with unknown orderCode are acknowledged without changing a local order (PayOS sends a sample when registering the webhook). Unexpected known orders or amount mismatches require manual reconciliation.
- Transactional payment confirmation requires a live PostgreSQL database. Integration and true end-to-end tests MUST be run against a dedicated non-production environment before enabling real payments.
- This patch does not implement refunds, payouts, automatic PayOS link cancellation, customer support/dispute tooling, or monitoring/alerting. Do not use for unsupervised real customer commerce without completing those controls.
- CI/lint of the **whole repository** must pass before PR merge. On any failure keep `PAYOS_ENABLED=false`.

## Proposed end-to-end verification

1. Verify `GET /api/health` on the Ass2 API HTTPS URL.
2. Check authentication; place one small permitted order using test data.
3. Check checkout link amount equals **database total**, not browser subtotal.
4. A signed sample webhook must not mutate another order.
5. Invalid HMAC and wrong amount must not set `PAID`.
6. Signed, matched payment confirmation must set one `Payment`, one `PaymentAttempt`, and `PAID`.
7. Duplicate webhook must not create duplicate payments.
8. Confirm return URL alone never marks paid; after verified webhook the browser can show paid.
9. Test recovery from DB/network errors and ensure manual reconciliation process is documented.
