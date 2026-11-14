# TV1 + TV6 integration fixup — Checkout payment wiring

- Removed the 600 ms frontend fake SUCCESS result.
- Default payment processor now POSTs /api/payments/mock with Bearer JWT and body {orderId,method,outcome:'SUCCESS',idempotencyKey}.
- Server uses its own Order.total, never client amount; mock-only API behind PAYMENT_MODE=mock.
- Retry keeps one Order key for a stable basket/method/token and one Payment key for an uncertain attempt.
- Confirmed FAILURE starts a new Payment key on next attempt.
- On ambiguous network/5xx/409, UI enters unknown, never silently marks Order PAID.
- 'Kiểm tra trạng thái' now GETs /api/payments/mock/status/:id and only marks paid if the server confirms a Payment record.
- Existing TV6 hook tests kept; three additional tests cover retries and uncertain status.

Important: frontend calling /api/orders may still receive 503 ORDER_STOCK_NOT_READY until TV4 integrates the actual stock callback. Browser E2E cannot be considered done before that and live Docker verification.
