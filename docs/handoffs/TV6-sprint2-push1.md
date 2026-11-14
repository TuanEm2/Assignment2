# Bàn giao TV6 — Sprint 2, Push đợt 1

- **Thành viên:** TV6 (Tích hợp frontend, Điều phối Checkout, UI Lịch sử đơn, QA & Sequence Diagram).
- **Ngày cập nhật:** 13/11/2026.
- **Nhánh làm việc:** `feature/tv6-integration-qa` (kế thừa sạch từ `origin/feature/tv5-auth-detail` tại commit `7f1b11c`).

---

## 1. Các hạng mục kỹ thuật TV6 hoàn thành trong Sprint 2

### A. Đồng bộ hợp đồng Auth với Backend thật của TV5
- Cập nhật chính sách mật khẩu Form Đăng ký (`/register`):
  - Đồng bộ giới hạn an toàn **12 đến 128 ký tự** theo chuẩn bảo mật băm scrypt của TV5.
  - Cập nhật hint và client-side validation khớp chính xác với lỗi 400 của Backend.
- Đảm bảo form Login (`/login`) lưu JWT token, tokenType, user vào Zustand `auth-store` và redirect linh hoạt theo tham số `?redirect=...`.

### B. Hoàn thiện Điều phối Đặt hàng (Checkout Orchestration)
- Xây dựng hook điều phối luồng: `apps/web/src/lib/checkout/use-checkout-orchestrator.ts`.
- Tích hợp trực tiếp vào màn hình thanh toán `apps/web/src/app/checkout/checkout-screen.tsx`:
  1. Kiểm tra trạng thái đăng nhập: nếu chưa login, yêu cầu đăng nhập trước khi thanh toán.
  2. Tạo mã **Idempotency-Key** duy nhất cho mỗi phiên thanh toán để chống tạo trùng đơn khi mạng giật.
  3. Chuẩn bị payload: chỉ gửi `productId`, `sizeId`, `toppingIds`, `quantity`. **Tuyệt đối không gửi giá tiền từ client** để chống gian lận giá.
  4. Gửi `POST /api/orders` với Header `Authorization: Bearer <JWT>` và `Idempotency-Key`.
  5. Xử lý phản hồi từ Backend, gọi tiếp dịch vụ thanh toán Mock Payment (Ví/Thẻ).
  6. Khi thanh toán thành công: gọi `clearCart()` xóa sạch giỏ hàng và chuyển giao diện sang trạng thái `paid` (hiển thị mã đơn và tổng tiền).
  7. Khi có lỗi (hết hàng/mạng lỗi): giữ nguyên giỏ hàng, chuyển sang phase `failed` và cung cấp nút **"Thử lại"** (Retry cùng idempotency key).

### C. Xây dựng Giao diện Lịch sử & Chi tiết trạng thái đơn (Order History & Status UI)
- Tạo trang danh sách đơn hàng: `apps/web/src/app/orders/` (`orders-view.tsx`, `page.tsx`, `orders.css`).
  - Hiển thị badge trạng thái màu sắc trực quan: `PENDING`, `PAID`, `PREPARING`, `COMPLETED`, `CANCELLED`.
  - Xử lý các trạng thái: Chưa đăng nhập, Đang tải (Loading), Danh sách rỗng (Empty), Báo lỗi (Error).
- Tạo trang chi tiết đơn hàng: `apps/web/src/app/orders/[id]/` (`order-detail-content.tsx`, `page.tsx`).
  - Hỗ trợ dynamic route với chuẩn `<Suspense>` của Next.js 16.
  - Hiển thị mã đơn, thời gian đặt, tổng tiền thanh toán và trạng thái hiện tại.

### D. Hoàn thiện Sequence Diagram — Checkout (Task 2.2 — Chủ trì chính ⭐️)
- Bám sát 100% mã nguồn thực tế của toàn bộ nhóm từ Sprint 1 đến Sprint 2.
- **Tạo phẩm bàn giao:**
  - File nguồn PlantUML: `docs/diagrams/sequence-checkout.puml`
  - File ảnh vector SVG xuất chuẩn: `docs/diagrams/sequence-checkout.svg`
  - Tài liệu thuyết minh chi tiết: `docs/diagrams/sequence-checkout.md`
- **Nội dung bao phủ đủ 5 Lifelines:** `Customer` → `Next.js UI` → `NestJS API` → `PostgreSQL (Prisma)` → `Payment Service`.
- Thể hiện đầy đủ: Kiểm tra JWT, Database Transaction định giá server-side & trừ kho, nhánh alt hết hàng (Rollback), thanh toán thành công, và nhánh Retry gửi lại cùng Idempotency Key.

---

## 2. Kết quả kiểm chứng chất lượng toàn Monorepo

Tất cả các pipeline kiểm tra đều đạt trạng thái xanh tuyệt đối:

```powershell
# 1. Toàn bộ Unit & Component Tests: 127 tests PASS
npm test
# -> Backend apps/api: 6 test suites, 72/72 tests PASS
# -> Frontend apps/web: 10 test files, 55/55 tests PASS

# 2. Test Tích hợp Hợp đồng liên module: 4 tests PASS
npm run test:integration

# 3. Linter toàn bộ dự án: 0 warnings, 0 errors
npm run lint

# 4. Biên dịch Production Build:
npm run build:api   # NestJS build dist/ thành công
npm run build:web   # Next.js build 12 routes static/dynamic thành công
```

---

## 3. Ranh giới tiếp theo cho Đợt 2

- Đón nhận callback trừ kho thực tế của TV4 khi TV4 nối xong ở đợt 2.
- Nhận API `GET /orders/me` đọc từ database thật của TV5/TV3 khi mở rộng.
- Viết kịch bản E2E Test tự động toàn luồng bằng Playwright/Cypress và chuẩn bị báo cáo nghiệm thu giao nộp bài tập lớn.
