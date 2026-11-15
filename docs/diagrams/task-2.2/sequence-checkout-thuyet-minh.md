# BrewLite — Sơ đồ Tuần tự Đặt hàng & Thanh toán (Task 2.2)

| Thuộc tính | Nội dung |
|---|---|
| Dự án | BrewLite — Assignment 2, Requirements to Deployment v1.0 |
| Phân công Task 2.2 | Trần Lê Nguyễn Nhật Ân (Mã vai trò: TV6) phụ trách thiết kế và thuyết minh |
| Người chuẩn bị bản này | Trần Lê Nguyễn Nhật Ân |
| Căn cứ yêu cầu | Đề Assignment2-BrewLite v1.0, mục 2.2 |
| Căn cứ nghiệp vụ | Đặc tả yêu cầu phần mềm SRS chính thức (FR-07, FR-08, FR-09, FR-10, FR-12, FR-13, FR-14, FR-15, FR-16, FR-18) |
| Tệp nguồn sơ đồ | `docs/diagrams/task-2.2/sequence-checkout-full.puml` |
| Tệp kết xuất đồ họa | `docs/diagrams/task-2.2/sequence-checkout-full.svg` (Vector), `sequence-checkout-full.png` (Ảnh HD) |
| Trạng thái | Đã hoàn thành 100%, kết xuất đầy đủ nguồn PlantUML và ảnh vector SVG/PNG |

---

## 1. Các Lifeline tham gia tương tác
Sơ đồ mô tả sự tương tác chặt chẽ theo thời gian thực giữa 6 đối tượng:
1. `User (Customer)`: Khách hàng thao tác trên giao diện Web.
2. `Web (Next.js App)`: Client quản lý giỏ hàng, phiên và điều phối checkout.
3. `Store (Zustand Store)`: Auth Store và Cart Store lưu trữ client-side.
4. `API (NestJS)`: Backend xử lý Guard, định giá server và transaction.
5. `DB (PostgreSQL)`: Cơ sở dữ liệu Prisma quản lý User, Order, OrderItem, Ingredient, Payment.
6. `Payment (Mock Payment)`: Dịch vụ cổng thanh toán giả lập.

## 2. Kịch bản luồng 4 giai đoạn
- **Giai đoạn 1 (Xác thực):** Kiểm tra session, nếu chưa đăng nhập $\to$ điều hướng sang `/login?redirect=/checkout`. Đăng nhập thành công trả về JWT Bearer và lưu vào persistent storage.
- **Giai đoạn 2 (Tạo đơn & Khóa kho nguyên liệu):**
  - Web sinh `Order Idempotency-Key` (UUID). Gửi payload chỉ có `{ items }`, **không gửi giá tiền** lên Server (Anti-tampering).
  - NestJS mở `Prisma.$transaction`: Replay đơn cũ nếu trùng key; tính giá Server-side từ Catalog; khóa nguyên liệu `WHERE stock >= qty`. Thiếu thì Rollback trả 400; đủ thì tạo đơn PENDING và lưu snapshot món vào `OrderItem`.
- **Giai đoạn 3 (Xử lý Thanh toán & Retry):**
  - Web sinh `Payment Idempotency-Key` riêng gọi `POST /api/payments/mock`.
  - Nếu thất bại: ghi nhận `PaymentAttempt` FAILURE, chuyển đơn sang `PAYMENT_FAILED`. Web cho phép bấm "Thử thanh toán lại" với key thanh toán MỚI trên cùng mã đơn.
  - Nếu thành công: ghi nhận `Payment` và `PaymentAttempt` SUCCESS, chuyển đơn sang `PAID`. Web xóa giỏ hàng (`clearCart()`) và hiển thị mã đơn.
- **Giai đoạn 4 (Lịch sử & Chi tiết Snapshot):**
  - `/orders`: Phân trang Keyset Cursor (`X-Next-Cursor`) hiển thị đơn cá nhân.
  - `/orders/:id`: Hiển thị snapshot món và thanh toán thật. **Bảo mật Multi-tenant:** Trả về **`HTTP 404 Not Found`** khi tài khoản này cố truy cập đơn của tài khoản khác.

---

## 3. Danh mục tệp bàn giao Task 2.2
1. **Mã nguồn PlantUML:** [sequence-checkout-full.puml](./sequence-checkout-full.puml)
2. **Ảnh vector sắc nét:** [sequence-checkout-full.svg](./sequence-checkout-full.svg)
3. **Ảnh độ phân giải cao:** [sequence-checkout-full.png](./sequence-checkout-full.png)
4. **Tài liệu thuyết minh:** [sequence-checkout-thuyet-minh.md](./sequence-checkout-thuyet-minh.md)
