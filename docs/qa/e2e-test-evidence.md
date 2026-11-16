# Báo cáo Bằng chứng Kiểm thử Toàn hệ thống E2E & Tích hợp (Task 5.2 — TV6)

| Thuộc tính | Nội dung |
|---|---|
| **Dự án** | BrewLite — Assignment 2, Requirements to Deployment v1.0 |
| **Thành viên phụ trách** | Trần Lê Nguyễn Nhật Ân (Mã vai trò: **TV6** — Tích hợp & QA) |
| **Nhiệm vụ trọng tâm** | **Mục 01 — Hoàn thiện E2E thật trên ứng dụng / API / DB thật** (Đáp ứng phản hồi Nhóm trưởng) |
| **Căn cứ yêu cầu** | Đề Assignment2-BrewLite v1.0 (Task 5.1, Task 5.2, Task 5.4); SRS v1.0 (18 FR, 9 NFR) |
| **Hai bộ tạo phẩm E2E** | 1. **System API E2E (HTTP/DB thật):** `tests/integration/checkout-e2e-flow.test.mjs`<br>2. **Browser E2E (Playwright/Edge thật):** `tests/e2e/browser-flow.test.mjs` |
| **Trạng thái kết quả** | **PASS 100%** trên cả 2 tầng kiểm thử (Bao gồm Menu, Chi tiết, Giỏ, Đăng ký, Đăng nhập JWT, Đặt đơn trừ kho thật, Mock Payment, Retry thanh toán, Lịch sử đơn, Snapshot và Bảo mật Multi-tenant 404) |

---

## 1. TỔNG QUAN KIẾN TRÚC KIỂM THỬ E2E HAI TẦNG (DUAL-LAYER E2E)

Để khắc phục hoàn toàn nhận xét *"E2E sử dụng hàm mô phỏng"* và *"Chưa thấy Browser E2E trên main"*, TV6 triển khai kiến trúc E2E hai tầng độc lập chạy trực tiếp trên hệ thống thật:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG 1: REAL BROWSER AUTOMATION E2E                             │
│                  File: tests/e2e/browser-flow.test.mjs (Playwright)                    │
│                                                                                        │
│  [Trình duyệt Edge] ──> [Next.js Web (port 3000)] ──> [NestJS API (4000)] ──> [PostgreSQL] │
│  - Bấm nút thật, điền form thật, tương tác giao diện thật                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         TẦNG 2: REAL SYSTEM API E2E                                    │
│             File: tests/integration/checkout-e2e-flow.test.mjs (HTTP Fetch)            │
│                                                                                        │
│  [Node.js Test Runner] ───────────────> [NestJS API (port 4000)] ─────────> [PostgreSQL]│
│  - Gửi REST HTTP thật, cấp JWT thật, trừ kho PostgreSQL thật, kiểm tra Retry & Multi-tenant│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. KẾT QUẢ KIỂM THỬ TẦNG 1: BROWSER AUTOMATION E2E THẬT (PLAYWRIGHT)

* **Lệnh thực thi:** `node --test tests/e2e/browser-flow.test.mjs` (hoặc `npm run test:e2e:browser`)
* **Môi trường:** Trình duyệt Microsoft Edge / Chromium, Frontend Next.js (port 3000), Backend NestJS (port 4000), Database PostgreSQL (port 5432).

### Nhật ký chạy thực tế (Console Log Output)
```text
TAP version 13
# 🚀 [Browser Launch] Khởi động trình duyệt (headless: true, slowMo: 0ms)...
# [Bước 1/8] Mở trang Đăng ký và điền form: customer_a_1794825933249@brewlite.vn...
#  -> Đăng ký thành công, đã chuyển hướng!
# [Bước 2/8] Đang ở trang Đăng nhập, tiến hành đăng nhập...
#  -> Đăng nhập thành công, đã lưu phiên JWT vào Web!
# [Bước 3/8] Duyệt Thực đơn (/menu) và chọn đồ uống...
#  -> Tìm thấy sản phẩm: /products/4a360468-cfbf-43fa-9b91-965e242e4edf. Đang mở chi tiết món...
# [Bước 4/8] Chọn Size, Topping và bấm "Thêm vào giỏ"...
#  -> Thông báo giỏ hàng: Đã thêm 2 Americano vào giỏ.
# [Bước 5/8] Mở Giỏ hàng (/cart)...
#  -> Giỏ hàng đã có 1 dòng món.
#  -> Đã chuyển sang màn hình Thanh toán (/checkout)!
# [Bước 6/8] Xác nhận thanh toán qua Mock Wallet...
#  -> 🎉 Giao diện hiển thị: Thanh toán thành công!
#  -> Mã đơn tạo thành công: 46a403f6-08cc-4406-bba1-3b161728d70b
# [Bước 7/8] Kiểm tra Lịch sử đơn hàng (/orders)...
#  -> Đơn hàng trong lịch sử có trạng thái: "Đã thanh toán"
# [Bước 8/8] Mở Chi tiết đơn hàng (/orders/[id])...
#  -> Đã mở trang Chi tiết đơn hàng: Đơn hàng #46a403f6
#  -> Thông tin thanh toán thật: Thông tin thanh toán Phương thức: MOCK_WALLET · Số tiền: 110.000 đ
# [Bảo mật] Kiểm thử phân quyền: Khách B mở phiên trình duyệt riêng và cố truy cập đơn của Khách A...
#  -> Khách B truy cập trái phép URL đơn của Khách A: /orders/46a403f6-08cc-4406-bba1-3b161728d70b...
#  -> Phản hồi bảo mật: Thông báo: Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập đơn này. (404)
# ============================================================
# ✅ CHÚC MỪNG: TOÀN BỘ LUỒNG E2E TRÊN WEB ĐÃ CHẠY VÀ PASS 100%!
# ============================================================
ok 1 - [E2E Browser 1] Chạy thông suốt toàn bộ luồng nghiệp vụ trực tiếp trên trình duyệt Web
1..1
# tests 1
# pass 1
# fail 0
# duration_ms 5602.52
```

---

## 3. KẾT QUẢ KIỂM THỬ TẦNG 2: REAL SYSTEM API E2E (10 BƯỚC KHÔNG MÔ PHỎNG)

* **Lệnh thực thi:** `node --test tests/integration/checkout-e2e-flow.test.mjs` (hoặc `npm run test:e2e:system`)
* **Môi trường:** Gọi trực tiếp REST API `http://localhost:4000` với cơ sở dữ liệu PostgreSQL `brewlite` đang hoạt động.

### Bảng chi tiết 10 bước kiểm chứng hệ thống thật:

| Bước | Endpoint API | Hành động & Nghiệp vụ kiểm tra | Mã phản hồi HTTP | Kết quả xác minh trên DB thật |
|---|---|---|:---:|---|
| **01** | `GET /api/products` | Lấy danh mục menu đồ uống | **200 OK** | Trả mảng sản phẩm thật kèm giá VND |
| **02** | `GET /api/products/:id` | Bóc tách chi tiết món, Size (S/M/L) và Topping | **200 OK** | Đọc cấu hình từ `ProductSize` và `ProductTopping` |
| **03** | `POST /api/auth/register` | Đăng ký tài khoản mật khẩu $\ge 12$ ký tự | **201 Created** | Ghi nhận bản ghi `User` mới; sanitized mật khẩu |
| **04** | `POST /api/auth/login` | Đăng nhập hệ thống | **200 OK** | Cấp phát token `accessToken` JWT Bearer thật |
| **05** | `POST /api/orders` | Tạo đơn hàng Server Pricing & Idempotency | **201 Created** | Tạo `Order` PENDING, trừ kho nguyên liệu `Ingredient.stock` trong transaction |
| **05b**| `POST /api/orders` (Replay) | Gửi lại cùng `idempotency-key` | **201 Created** | Replay đơn cũ, **không trừ kho lần 2** |
| **06** | `POST /api/payments/mock` | Thanh toán Mock Wallet thành công | **200 OK** | Cập nhật `Order.status = 'PAID'`, ghi `Payment` |
| **07** | `POST /api/payments/mock` (Failure) | Giả lập lỗi thanh toán thẻ (`FAILURE`) | **200 OK** | Cập nhật `Order.status = 'PAYMENT_FAILED'` |
| **07b**| `POST /api/payments/mock` (Retry) | Thử lại thanh toán với Key MỚI | **200 OK** | Đơn chuyển sang `PAID`, không nhân bản đơn hàng |
| **08** | `GET /api/orders/me` | Xem Lịch sử đơn hàng cá nhân | **200 OK** | Danh sách chứa đúng các đơn thuộc chủ tài khoản |
| **09** | `GET /api/orders/:id` | Xem Snapshot chi tiết món và thanh toán | **200 OK** | Trả snapshot `OrderItem` và giao dịch thật |
| **10** | `GET /api/orders/:id` (Hacker) | Khách B cố đọc đơn của Khách A | **404 Not Found** | Chặn rò rỉ dữ liệu, từ chối không tiết lộ đơn |

### Nhật ký chạy thực tế (Console Log Output)
```text
TAP version 13
# Subtest: [E2E System Test] Khảo sát tính sẵn sàng của Backend API và Database PostgreSQL
ok 1 - [E2E System Test] Khảo sát tính sẵn sàng của Backend API và Database PostgreSQL
# ============================================================
# 🎉 E2E REAL SYSTEM TEST: 10/10 BƯỚC CHẠY TRÊN BACKEND & DB THẬT ĐÃ PASS 100%!
# ============================================================
# Subtest: [E2E System Flow] Chạy toàn diện luồng nghiệp vụ trên API NestJS & Database PostgreSQL thật
ok 2 - [E2E System Flow] Chạy toàn diện luồng nghiệp vụ trên API NestJS & Database PostgreSQL thật
1..2
# tests 2
# pass 2
# fail 0
# duration_ms 1052.74
```

---

## 4. GIẢI QUYẾT TOÀN DIỆN CÁC ĐIỂM NHÓM TRƯỞNG PHẢN HỒI

| Điểm phản hồi của Nhóm trưởng | Hiện trạng & Bằng chứng TV6 đã hoàn thiện |
|---|---|
| **1. "E2E của TV6 chưa phải E2E toàn hệ thống, dùng Map() mô phỏng"** | **ĐÃ GIẢI QUYẾT TRIỆT ĐỂ:** File `tests/integration/checkout-e2e-flow.test.mjs` đã được viết lại 100% bằng REST HTTP fetch gọi trực tiếp vào API NestJS và PostgreSQL thật. Đã loại bỏ hoàn toàn các cấu trúc mock Map(). |
| **2. "Ma trận truy vết tham chiếu tests/e2e/browser-flow.test.mjs nhưng chưa thấy trên main"** | **ĐÃ GIẢI QUYẾT TRIỆT ĐỂ:** File `tests/e2e/browser-flow.test.mjs` đã hoàn thiện và nằm trên nhánh `feature/tv6-integration-qa`. Nhóm trưởng chỉ cần merge nhánh này vào `main` hoặc duyệt PR của TV6. |
| **3. "Lịch sử, trạng thái, retry thanh toán: Có code, còn trường hợp cần kiểm chứng"** | **ĐÃ KIỂM CHỨNG BẰNG TEST THẬT:** Bước 7 và Bước 7b trong E2E test chứng minh rõ ràng: Khi thanh toán FAILURE $\to$ status chuyển `PAYMENT_FAILED`. Khi người dùng thử lại với key mới $\to$ status chuyển `PAID` thành công trên cùng mã đơn. |
| **4. "API E2E PostgreSQL: Có file, chưa xác nhận chạy toàn bộ đạt"** | Cả bài test `checkout-e2e-flow.test.mjs` và `browser-flow.test.mjs` đều chạy trực tiếp trên PostgreSQL thật của dự án (`localhost:5432/brewlite`) và PASS 100%. |

---

## 5. HƯỚNG DẪN NHÓM TRƯỞNG ĐỒNG BỘ VÀ KIỂM CHỨNG TRÊN MAIN

Nhóm trưởng chỉ cần thực hiện 2 lệnh Git sau để kéo toàn bộ tạo phẩm E2E thật của TV6 vào nhánh `main`:

```powershell
# 1. Chuyển sang nhánh main và merge nhánh TV6
git checkout main
git merge feature/tv6-integration-qa

# 2. Chạy bài test E2E toàn hệ thống trên API & DB thật
npm run dev:api   # Khởi động Backend API (Port 4000)
npm run test:integration   # Chạy 10/10 bước E2E thật (PASS 100%)

# 3. Chạy bài test E2E trên trình duyệt Web thật (Playwright)
npm run dev:web   # Khởi động Frontend Web (Port 3000)
npm run test:e2e:browser   # Tự động hóa trình duyệt Edge (PASS 100%)
```
