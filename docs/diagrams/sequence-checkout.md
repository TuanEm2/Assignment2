# Sequence Diagram — Quy trình Đặt hàng và Thanh toán BrewLite

- **Mã phân công:** Task 2.2 (Thành viên 6 chủ trì chính).
- **File nguồn:** `docs/diagrams/sequence-checkout.puml`
- **File đồ họa xuất:** `docs/diagrams/sequence-checkout.svg`
- **Căn cứ nghiệp vụ:** Use-case Đặt và thanh toán (Task 1.3), SRS, và kiến trúc thực tế Sprint 2.

---

## 1. Các Lifeline tham gia quy trình

1. **Customer (Người dùng):** Thao tác trên giao diện Mobile-first PWA.
2. **Next.js UI (Client Web):** Quản lý giỏ hàng (`useCartStore`), trạng thái xác thực (`useAuthStore`) và điều phối tạo đơn (`useCheckoutOrchestrator`).
3. **NestJS API (Backend):** Xử lý xác thực JWT Guard (`POST /orders`), định giá server-side và điều phối giao dịch.
4. **PostgreSQL (Prisma ORM):** Cơ sở dữ liệu lưu trữ User, Order, OrderItem, Payment, Ingredient, Inventory.
5. **Payment Service (Mock Payment):** Dịch vụ cổng thanh toán mô phỏng (Ví điện tử / Thẻ ngân hàng), hỗ trợ Idempotency Key.

---

## 2. Chi tiết 4 giai đoạn trong luồng tuần tự

### Giai đoạn 1: Xác thực người dùng (Auth Flow)
- Khách hàng bấm "Thanh toán" tại trang `/cart`.
- Frontend kiểm tra `isAuthenticated` trong `auth-store.ts`.
- Nếu chưa đăng nhập: Điều hướng sang `/login?redirect=/checkout`.
- Người dùng nhập email & mật khẩu (chính sách bảo mật >= 12 ký tự). Backend NestJS xác thực qua thuật toán băm `scrypt` bất đối xứng và cấp JWT token (thời hạn 3600s).

### Giai đoạn 2: Điều phối Tạo đơn hàng (Orchestration & Anti-tampering)
- Khách hàng chọn phương thức thanh toán (Ví hoặc Thẻ) và bấm "Xác nhận thanh toán".
- Frontend sinh mã **Idempotency-Key** duy nhất để chống tạo trùng đơn khi mạng lag.
- **Quy tắc an toàn giá:** Client chỉ gửi danh sách sản phẩm gồm `productId`, `sizeId`, `toppingIds` và `quantity`. **Không gửi giá tiền** từ client để chống hack giá qua DevTools/Proxy.
- Gửi `POST /api/orders` với Header `Authorization: Bearer <JWT>` và `Idempotency-Key`.

### Giai đoạn 3: Giao dịch Database (Database Transaction)
- `JwtAuthGuard` tại NestJS giải mã token, xác minh tính toàn vẹn và gắn `userId` vào request.
- NestJS mở **Prisma Transaction (`$transaction`)**:
  1. Đọc bảng giá gốc, phụ thu size, phụ thu topping từ database để tính lại tổng tiền chính thức.
  2. Kiểm tra tồn kho nguyên liệu theo định lượng ly. Nếu thiếu nguyên liệu: **ROLLBACK** và trả lỗi 400/503.
  3. Nếu đủ hàng: Lưu bản ghi `Order` (trạng thái `PENDING`), tạo các `OrderItem` và bản ghi `Payment`.
  4. **COMMIT TRANSACTION** và trả về mã đơn hàng `orderId` cùng tổng tiền thực tế.

### Giai đoạn 4: Thanh toán (Payment) & Cơ chế Thử lại (Idempotency Retry)
- Client gọi dịch vụ thanh toán `POST /api/payments` với `orderId`, `amount`, và `idempotencyKey`.
- **Nhánh thành công:**
  - Nhận kết quả thành công, cập nhật trạng thái đơn thành `PAID`.
  - Frontend gọi `clearCart()` xóa sạch giỏ hàng và hiển thị màn hình "Thanh toán thành công" kèm mã đơn.
- **Nhánh lỗi / Mạng gián đoạn:**
  - Hiển thị thông báo thanh toán thất bại, giữ nguyên giỏ hàng và cung cấp nút **"Thử lại"**.
  - Khi bấm thử lại, Client gửi lại request với **CÙNG idempotencyKey**. Cổng thanh toán nhận diện key đã xử lý, trả lại kết quả giao dịch mà **không trừ tiền hai lần**.
