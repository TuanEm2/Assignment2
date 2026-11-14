# Bàn giao TV6 — Sprint 2, Push đợt 2 (Hoàn tất toàn bộ phạm vi Sprint 2)

- **Thành viên:** TV6 (Tích hợp frontend, Điều phối Checkout, Lịch sử đơn hàng UI, E2E & Smoke Test).
- **Ngày hoàn thành:** 14/11/2026.
- **Nhánh làm việc:** `feature/tv6-integration-qa`.
- **Nền nhận:** Đã merge sạch commit `61f930b` từ `origin/feature/tv5-auth-detail` (bao gồm toàn bộ mã nguồn Push 2 của TV1, TV2, TV3, TV4, TV5).

---

## 1. Các hạng mục kỹ thuật TV6 hoàn thành trong Push đợt 2

Theo đúng bảng phân công Sprint 2 Push 2 ("Kết nối toàn bộ Checkout, Order History UI, E2E và Smoke Test") và giải quyết trọn vẹn 2 vấn đề UI đã thỏa thuận trong hợp đồng TV5 (`docs/handoffs/TV5-TV6-history-integration.md`):

### A. Sửa triệt để 2 lỗi UI Lịch sử đơn hàng (Order History UI)

#### 1. Chi tiết đơn hàng (`apps/web/src/app/orders/[id]/order-detail-content.tsx`):
- **Xóa bỏ hoàn toàn dữ liệu giả lập (fake fallback):** Tuyệt đối không tự tạo object mẫu `{ total: 90000, status: 'PAID' }` khi API thất bại.
- **Xử lý chính xác các mã lỗi HTTP từ Backend thật:**
  - `401 Unauthorized`: Báo phiên hết hạn, cung cấp nút/link đăng nhập lại và tự động chuyển hướng về đơn hàng sau khi đăng nhập.
  - `404 Not Found`: Báo rõ ràng đơn hàng không tồn tại hoặc tài khoản hiện tại không có quyền truy cập.
  - `400 Bad Request`: Báo mã đơn không hợp lệ.
  - `5xx / Network Error`: Hiển thị thông báo sự cố máy chủ và cung cấp nút **"Thử lại"** (Retry) gọi lại dữ liệu mà không cần tải lại toàn trang.
- **Hỗ trợ đầy đủ 7 trạng thái đơn hàng chuẩn:** `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.
- **Hiển thị đầy đủ Snapshot món ăn và Thanh toán:**
  - Bảng chi tiết từng món: Tên sản phẩm, Kích cỡ (Size), Topping đã chọn, Số lượng, Đơn giá và Thành tiền.
  - Khối thông tin thanh toán: Phương thức (Ví điện tử / Thẻ), Số tiền đã thanh toán, Thời gian thanh toán từ bản ghi DB thật.

#### 2. Danh sách lịch sử đơn hàng (`apps/web/src/app/orders/orders-view.tsx`):
- **Phân biệt rạch ròi giữa Lỗi và Danh sách rỗng thật:**
  - Đã loại bỏ hoàn toàn cơ chế `setOrders([])` khi `!res.ok`. Lỗi mạng, 401 hoặc 500 được hiển thị dưới dạng banner lỗi (`role="alert"`) cùng nút **"Thử lại"**.
  - Trạng thái *"Bạn chưa có đơn hàng nào"* chỉ xuất hiện khi API trả về HTTP 200 OK kèm mảng rỗng `[]`.
- **Cập nhật đầy đủ nhãn và badge:** Bổ sung `PAYMENT_FAILED` (*Thanh toán thất bại*) và `READY` (*Sẵn sàng phục vụ*).
- **Phân trang Keyset Cursor:** Tự động đọc header `X-Next-Cursor` từ Backend. Khi có nhiều hơn 20 đơn, hiển thị nút **"Xem các đơn cũ hơn"** để tải tiếp trang sau mà không làm mất các đơn đã tải.
- **Dọn dẹp State khi đổi phiên (Account Isolation):** Đăng xuất hoặc chuyển tài khoản sẽ tự động xóa sạch danh sách đơn cũ trong memory, ngăn chặn rò rỉ dữ liệu giữa các người dùng.

#### 3. Cập nhật CSS bổ trợ (`apps/web/src/app/orders/orders.css`):
- Định dạng màu sắc badge trực quan cho `.status-payment-failed`, `.status-ready`.
- Bảng chi tiết món `.order-items-table`, khối thanh toán `.order-payment-info`, nút retry `.btn-retry`, nút phân trang `.btn-load-more`.

---

### B. Ráp nối thông suốt Checkout $\to$ Order History

- Tại màn hình xác nhận thanh toán (`apps/web/src/app/checkout/checkout-view.tsx`), khi đơn hàng đạt trạng thái `paid`:
  - Cung cấp liên kết trực tiếp **"Xem chi tiết đơn"** dẫn thẳng tới `/orders/[id]`.
  - Cung cấp liên kết **"Lịch sử đơn hàng"** dẫn tới `/orders`.
  - Đảm bảo giỏ hàng đã được xóa sạch (`clearCart()`) và khách hàng có thể theo dõi đơn hàng của mình ngay lập tức.

---

### C. Bộ kiểm thử tích hợp toàn luồng End-to-End (E2E Integration Test)

Tạo file kiểm thử E2E: `tests/integration/checkout-e2e-flow.test.mjs`:
1. **Luồng Xác thực & Phân quyền:** Đăng ký $\to$ Đăng nhập $\to$ Xác thực cấu trúc JWT Bearer $\to$ Kiểm tra mật khẩu >= 12 ký tự.
2. **Luồng Giỏ hàng & Chống gian lận giá:** Client tính giá tạm tính, payload gửi lên backend chỉ chứa `productId`, `sizeId`, `toppingIds`, `quantity` (không chứa giá tiền).
3. **Luồng Đặt hàng & Trừ tồn kho:** Server tự định giá, kiểm tra công thức nguyên liệu, trừ kho có điều kiện, bảo toàn Idempotency Key khi gửi lặp.
4. **Luồng Thanh toán & Retry:** Thanh toán thất bại $\to$ Giữ nguyên đơn $\to$ Tạo Idempotency Key thanh toán mới $\to$ Thanh toán thành công $\to$ Cập nhật `PAID`.
5. **Luồng Lịch sử & Chi tiết đơn hàng:** Đọc danh sách đơn thuộc sở hữu người dùng, phân trang cursor, đọc snapshot chi tiết món.
6. **Bảo mật Multi-tenant:** Tài khoản B cố tình truy cập đơn của Tài khoản A nhận phản hồi `404 Not Found` tuyệt đối.

---

### D. Bộ kiểm thử Production Smoke Test (Task 5.2 & 5.4)

Tạo file kiểm thử Smoke Test: `tests/smoke/smoke-test.mjs` và bổ sung lệnh `npm run test:smoke` vào `package.json`:
1. **Smoke 1:** Tính toàn vẹn của biến môi trường (`DATABASE_URL`, `JWT_SECRET` >= 32 byte).
2. **Smoke 2:** Tính nhất quán của Prisma Schema và các model cốt lõi (`User`, `Product`, `ProductSize`, `ProductTopping`, `Ingredient`, `Order`, `OrderItem`, `Payment`).
3. **Smoke 3:** Tính sẵn sàng của bản build production (`apps/api/dist` và `apps/web/.next`).
4. **Smoke 4:** Sự hiện diện của toàn bộ các route client trọng yếu (`/`, `/menu`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`, `/login`, `/register`).
5. **Smoke 5:** Kiểm tra ranh giới bảo mật API (chặn request không token với HTTP 401, không làm lộ hash mật khẩu).

---

## 2. Bảng tổng hợp kết quả kiểm thử toàn diện Monorepo

| Bộ kiểm thử | Lệnh thực thi | Kết quả | Trạng thái |
| :--- | :--- | :---: | :---: |
| **Backend Unit Tests** | `npm run test -w apps/api -- --runInBand` | 9 suites, 108 tests | **PASS 100%** |
| **Frontend Component Tests** | `npm run test -w apps/web` | 11 files, 65 tests | **PASS 100%** |
| **Cart Calculations** | `npm run test:cart` | 5 tests | **PASS 100%** |
| **Integration & E2E Contracts** | `npm run test:integration` | 9 tests | **PASS 100%** |
| **Production Smoke Tests** | `npm run test:smoke` | 5 tests | **PASS 100%** |
| **Linter toàn bộ dự án** | `npm run lint` | Oxlint (55 files) + ESLint | **0 Errors, 0 Warnings** |
| **Production Build API** | `npm run build:api` | NestJS dist/ | **SUCCESS** |
| **Production Build Web** | `npm run build:web` | Next.js 16 (12 static/dynamic routes) | **SUCCESS** |

---

## 3. Checklist chuyển giao cho Nhóm trưởng và TV1

- [x] Đã hoàn thành 100% các đầu việc của TV6 trong cả 2 đợt push.
- [x] Đã sửa trọn vẹn 2 lỗi UI của Order History theo đúng hợp đồng TV5.
- [x] Đã kết nối thông suốt luồng nghiệp vụ: Đăng nhập $\to$ Menu $\to$ Giỏ hàng $\to$ Checkout $\to$ Mock Payment $\to$ Lịch sử đơn hàng.
- [x] Hệ thống đạt trạng thái xanh tuyệt đối trên mọi suite kiểm thử.
- [x] Mã nguồn sạch sẽ, sẵn sàng để TV1 thực hiện bước triển khai Docker Compose, CD và bàn giao sản phẩm cuối cùng.
