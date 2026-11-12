# TV1 — Sprint 1: CI + API Health Check

Branch tích hợp: `feature/tv1-devops`. Không push hoặc merge vào `main` trong đợt bàn giao này.

## Bàn giao
- `.github/workflows/ci.yml`: CI cho pull request vào `main`, push lên các nhánh `feature/**` và chạy thủ công.
- `apps/api/src/app.controller.ts`: `GET /api/health` nhờ `configureHttp()` đặt global prefix `/api`.
- `apps/api/src/app.service.ts`: JSON `{ status: 'ok', service: 'brewlite-api', timestamp: '...' }`.
- Unit test `apps/api/src/app.controller.spec.ts`, E2E test `apps/api/test/app.e2e-spec.ts`.

`GET /api/health` là **liveness check**, chỉ xác nhận NestJS phản hồi; KHÔNG xác nhận PostgreSQL đang sẵn sàng. Khi làm deployment, cần triển khai readiness check cho DB riêng nếu yêu cầu.

## Kiểm tra local

Từ root:

```powershell
npm ci
npm run db:generate
npm run db:validate
npm run lint
npm run test
npm run test:cart
npm run test:integration
npm run build:api
npm run build:web
npm run test:e2e -w apps/api -- --runInBand
```

Cần `DATABASE_URL` hợp lệ về cú pháp cho Prisma. Trước khi gọi API thực tế dùng PostgreSQL, phải chạy database và migration/seed theo hướng dẫn TV2.

Chạy API:

```powershell
npm run dev:api
# GET http://localhost:4000/api/health
```

## CI trên GitHub
1. Vào repository → **Actions** → **BrewLite CI** để xem run sau khi push lên `feature/tv1-devops`.
2. Mỗi bước phải xanh mới đủ điều kiện PR; nếu đỏ, xem log, sửa code trên nhánh của người phụ trách.
3. `main` chỉ được merge qua PR theo thứ tự Task 1–5 của Assignment 2. Bật ruleset yêu cầu CI thành công trước merge (repo admin thực hiện).
4. Ghi lại đường dẫn run CI thành công và một run phát hiện lỗi làm minh chứng Task 4.4.

## Bàn giao tiếp theo
- TV2: schema mở rộng `User`, `Order`, `OrderItem`, `Payment`.
- TV3/TV4: OrdersService và trừ kho transaction.
- TV1: `POST /api/payments` mock có idempotency sau khi hợp đồng Order/Payment chốt.
- TV6: Checkout orchestration + E2E thực tế; hiện tại integration contract vẫn là test mô phỏng.

**Giới hạn xác minh:** File CI được viết dựa trên scripts hiện có và báo cáo TV6. Cần xem Actions run thực tế để xác nhận pipeline xanh.
