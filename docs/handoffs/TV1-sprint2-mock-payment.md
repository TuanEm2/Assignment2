# TV1 — Sprint 2 / Push 2: Mock Payment + idempotency

## Endpoint
- POST /api/payments/mock (Bearer JWT, PAYMENT_MODE=mock)
- GET /api/payments/mock/status/:orderId (Bearer JWT, PAYMENT_MODE=mock)

POST JSON: { "orderId": "<UUID>", "method": "MOCK_WALLET" | "MOCK_CARD", "outcome": "SUCCESS" | "FAILURE", "idempotencyKey": "pay-idem-..." }
Không nhận amount hoặc userId từ request; amount luôn đọc từ Order. SUCCESS/FAILURE là **chỉ** dành cho chế độ giả lập.

## Chống xử lý trùng
- PostgreSQL transaction khóa dòng Order thuộc user qua SELECT ... FOR UPDATE.
- Dò PaymentAttempt bằng unique ghép (orderId, idempotencyKey).
- Cùng key/payload: trả response cũ, replayed=true; không tạo thêm Payment/Attempt.
- Cùng key nhưng khác method/outcome: HTTP 409.
- Key mới cho đơn đã có Payment: HTTP 409.
- FAILURE: lưu PaymentAttempt, cập nhật PAYMENT_FAILED; retry attempt mới bằng key mới có thể thành công.
- SUCCESS: tạo Payment (unique orderId), Order PAID, PaymentAttempt, cùng transaction.
- P2002/P2034: chuyển HTTP 409; client dùng cùng key để retry sau khi kiểm tra kết quả.

## Giao diện checkout
- TV6 ban đầu đang dùng timer trả SUCCESS giả; TV1 nối default payment processor vào backend /api/payments/mock.
- Giữ key order/payment qua retry cùng cart, tránh sinh key mới vô điều kiện; khi kết quả request không chắc chắn thì xác minh GET /api/payments/mock/status/:id.
- Giới hạn: checkout UI và order creation cần stock callback thật từ TV4; nếu ORDER_STOCK_NOT_READY thì POST /api/orders trả 503. Không thể tuyên bố E2E thành công cho tới khi callback được tích hợp và smoke với PostgreSQL.

## Kiểm tra
- npm run db:generate
- npm run lint
- npm run test
- npm run build:api
- npm run build:web
- docker compose config --quiet (điền .env)
- PostgreSQL integration tests cho row locking/rollback, run CI và smoke Docker trên máy có Docker.

## Chưa hoàn thành ở bước này
- CD tới hosting đích và rollback tự động cần URL, deployment credentials/secrets và quy trình release thực tế. Không commit secrets.
- E2E qua Docker và Postgres yêu cầu môi trường thực thi được cấu hình.
