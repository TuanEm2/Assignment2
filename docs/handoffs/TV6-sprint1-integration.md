# Bàn giao TV6 — Sprint 1 (Vòng 1: Nền tảng kiểm thử & Khung Auth UI / Test Harness)

- **Thành viên:** TV6 (Tích hợp frontend, Integration/E2E testing, QA Evidence).
- **Nhánh thực hiện:** `feature/tv6-integration-qa` (kế thừa sạch từ `origin/feature/tv5-auth-detail` tại commit `0d9fe56`).
- **Phạm vi Vòng 1:** Chuẩn bị test plan, harness/integration skeleton, minh chứng kiểm thử và hoàn thiện khung Auth UI + Auth Store phía Web phục vụ luồng đặt hàng.

---

## 1. Các hạng mục kỹ thuật TV6 đã hoàn thành trong Vòng 1

### A. Sửa lỗi cấu hình Jest ESM và xanh hóa toàn bộ bộ test
- **Vấn đề tồn đọng từ các nhánh trước:** Jest trong `apps/api` xung đột module ESM với NestJS v12 (`@nestjs/common`, `@nestjs/testing`), gây lỗi `Must use import to load ES Module`.
- **Giải pháp của TV6:** 
  - Tối ưu cấu hình `apps/api/jest.config.ts` hỗ trợ native ESM và `ts-jest` transpilation.
  - Sửa khai báo mock `jest` theo chuẩn ESM `@jest/globals` trong `products.service.spec.ts`.
  - Kết quả: `apps/api` pass toàn bộ **4/4 unit tests**; monorepo đạt trạng thái xanh sạch.

### B. Xây dựng Auth Store & Giao diện Auth UI (`apps/web`)
- **Store xác thực:** `apps/web/src/stores/auth-store.ts` sử dụng Zustand với cơ chế persist `localStorage` (`brewlite-auth-v1`), quản lý JWT token và profile người dùng.
- **Form Đăng nhập:** `apps/web/src/app/login/` (`login-form.tsx`, `page.tsx`, `login.css`):
  - Giao diện mobile-first, nền xám sáng (`#f1f5f9`), khung form trắng, chữ đen đậm tương phản cao.
  - Hỗ trợ tham số URL `?redirect=...` để tự động quay lại luồng đặt hàng sau khi đăng nhập.
  - Xử lý trạng thái loading, disabled nút bấm, thông báo lỗi từ server, validate form client-side.
- **Form Đăng ký:** `apps/web/src/app/register/` (`register-form.tsx`, `page.tsx`):
  - Form thu thập họ tên, email, mật khẩu, xác nhận mật khẩu (tối thiểu 6 ký tự).
  - Client-side validation kiểm tra mật khẩu khớp và độ dài an toàn.
- **Kiểm thử tự động (Frontend):**
  - `auth-store.test.ts`: 4 test cases kiểm tra lưu/xóa token và chặn dữ liệu sai.
  - `login.test.tsx`: 4 test cases kiểm tra render, validation rỗng, đăng nhập thành công, xử lý lỗi API.
  - `register.test.tsx`: 3 test cases kiểm tra render, mật khẩu không khớp, đăng ký thành công.
  - **Tổng cộng `apps/web`:** **34/34 tests pass 100%**.

### C. Dựng khung Test Harness & Integration Skeleton (`tests/`)
- Tạo bộ kiểm thử hợp đồng liên module: `tests/integration/checkout-contract.test.mjs`:
  1. Hợp đồng Auth Payload & Token giữa TV5 (Auth) và TV6 (Auth UI).
  2. Hợp đồng Cart Line giữa TV1 (Store) và TV6 (Checkout) — bảo đảm tính toán giá server-side, client không gửi giá tùy tiện.
  3. Hợp đồng Idempotency Key giữa TV1 (Mock Payment) và TV6 (Orchestration) — chống trừ tiền trùng khi client retry.
  4. Hợp đồng State Machine giữa TV3 (Orders) và TV6 (Status tracking) — bảo đảm vòng đời trạng thái đơn hợp lệ.
- Bổ sung lệnh chạy nhanh: `npm run test:integration`.

---

## 2. Kết quả kiểm chứng chất lượng mã nguồn

Tất cả các lệnh kiểm tra đều đạt 100% trên nhánh `feature/tv6-integration-qa`:

```powershell
# 1. Chạy toàn bộ unit test (API: 4 tests, Web: 34 tests)
npm test

# 2. Chạy test tích hợp hợp đồng (Integration Contract)
npm run test:integration

# 3. Chạy linter toàn bộ dự án (0 warnings, 0 errors)
npm run lint

# 4. Biên dịch Production Build Backend & Frontend
npm run build:api
npm run build:web
```

---

## 3. Ranh giới bàn giao sang Vòng 2 (Sprint 2)

Tuân thủ nghiêm ngặt ranh giới phân công:
1. **TV2:** Cung cấp schema `User`, `Order`, `OrderItem`, `Payment`.
2. **TV5:** Sở hữu Auth backend NestJS (viết API thật kết nối bảng `User`, JWT Guard, hash mật khẩu). Giao diện `/login` và `/register` của TV6 đã sẵn sàng kết nối.
3. **TV3 & TV4:** Cung cấp API `POST /api/orders` (trừ kho và tính giá server-side) và `GET /api/orders/me`.
4. **TV1:** Cung cấp Mock Payment API (`POST /api/payments`).
5. **TV6 sẽ thực hiện ở Vòng 2:**
   - Hoàn thiện hook Checkout Orchestration (Cart → Auth → Order → Payment).
   - Viết trang Lịch sử & Chi tiết trạng thái đơn (`/orders`, `/orders/:id`).
   - Viết trọn bộ End-to-End (E2E) Test và Smoke Test Production.
   - Vẽ **Sequence Diagram Checkout (Task 2.2)** chuẩn xác bám sát 100% mã nguồn thực tế đã chạy.
