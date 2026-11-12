# TV4 — Bàn giao Sprint 2, đợt push 1

- Thành viên: TV4.
- Ngày cập nhật: 12/11/2026.
- Nhánh: `feature/tv4-menu-stock`.
- Nền tích hợp: code mới từ `feature/tv3-products-orders`.
- Commit đợt 1 của TV4: `17b8c18`. Xem [bàn giao Sprint 2 cho TV5](TV5-START.md) để lấy bản tích hợp có schema nguyên liệu và điểm nối giữ kho.

## 1. Phạm vi công việc

Gói đợt 1 của TV4 gồm:

1. Sửa và thống nhất Product API URL.
2. Viết OrdersController, kết nối OrdersService của TV3.
3. Bổ sung test cho URL và tầng HTTP tạo đơn.

Logic tồn kho nguyên liệu và concurrency test thuộc đợt 2.

## 2. Thống nhất Product API URL

Đã tạo helper:

```text
apps/web/src/lib/products/url.ts
```

Menu và Product Detail cùng sử dụng `getProductsUrl()`.

Helper hỗ trợ URL cấu hình có hoặc chưa có hậu tố `/api`,
có dấu `/` cuối hoặc khoảng trắng bao quanh.

Ví dụ các cấu hình sau đều tạo đúng URL danh sách:

```text
http://localhost:4000
http://localhost:4000/
http://localhost:4000/api
http://localhost:4000/api/
```

URL kết quả:

```text
GET /api/products
GET /api/products/:id
```

ID được mã hóa trước khi đưa vào đường dẫn.
Khi không có cấu hình, dùng API local tại cổng 4000.

Các file đã sửa:

```text
apps/web/src/app/menu/menu.tsx
apps/web/src/lib/products/detail.ts
```

## 3. OrdersController

Đã tạo và đăng ký endpoint:

```text
POST /api/orders
```

Controller thực hiện:

- Nhận payload chỉ gồm `items`.
- Mỗi dòng nhận `productId`, `sizeId`, `toppingIds`, `quantity`.
- Dùng lại validation UUID/lựa chọn/số lượng của TV3.
- Từ chối các trường ngoài contract như giá, tổng tiền,
  trạng thái hoặc chủ đơn do client gửi.
- Lấy chủ đơn từ `request.user.id` do Auth backend xác thực.
- Validate header `Idempotency-Key` bằng helper TV3.
- Gọi `OrdersService.createOrder()` và truyền điểm nối giữ kho.
- Giữ nguyên lỗi nghiệp vụ do OrdersService trả về.

TV3 tiếp tục sở hữu tính giá server-side, lưu Order/OrderItem,
transaction, idempotency nghiệp vụ và state machine.

### File backend

```text
apps/api/src/orders/order-http.input.ts
apps/api/src/orders/order-stock.port.ts
apps/api/src/orders/orders.controller.ts
apps/api/src/orders/orders.module.ts
```

### Trạng thái tích hợp

| Trường hợp | HTTP |
|---|---:|
| Thiếu hoặc sai principal đã xác thực | 401 |
| Payload/header không hợp lệ | 400 |
| Service không tìm thấy dữ liệu | 404 |
| Service báo xung đột | 409 |
| Chưa cấu hình callback giữ kho | 503 |
| Service trả đơn thành công khi đủ đầu vào tích hợp | 201 |

API ứng dụng cần Auth backend của TV5 và InventoryService của TV4
để nhận đơn từ khách. Suite PostgreSQL kiểm tra route, lưu đơn
và gửi lại yêu cầu với principal và callback thử nghiệm.

Controller không tự xác thực JWT. TV5 cần nối guard/middleware
để xác thực token và gắn người dùng lên `request.user`.

## 4. Điểm nối giữ kho

Đã khai báo injection token:

```ts
ORDER_STOCK_RESERVATION
```

Callback kế thừa kiểu `CreateOrderOptions['reserveStock']`
của TV3. Chữ ký trong bản tích hợp là
`reserveStock(tx, { orderId, items })`. Mỗi dòng có
`productId`, `sizeId`, `toppingIds` và `quantity`.
Callback dùng cùng transaction để cập nhật tồn và ghi `OrderIngredient`.

Khi callback chưa được đăng ký, controller trả:

```text
503 — ORDER_STOCK_NOT_READY
```

Ở trường hợp này, controller chưa gọi service tạo đơn.
Chưa triển khai thuật toán cập nhật tồn kho trong đợt 1.

## 5. Kiểm thử

### Test HTTP OrdersController

File:

```text
apps/api/src/orders/orders.controller.spec.ts
```

Đã bổ sung 19 test, bao phủ:

- Prefix `/api/orders`.
- Principal thiếu hoặc không hợp lệ.
- Không lấy danh tính từ body/header do client gửi.
- Payload sai và các trường ngoài contract.
- Header idempotency sai/hợp lệ.
- Chưa có provider giữ kho.
- Chuyển payload và callback tới OrdersService.
- Phản hồi 201 và chuyển tiếp lỗi 400/404/409 từ service.

Các test dùng principal, OrdersService và callback giữ kho giả lập.
Kết quả 201 trong test không chứng minh JWT, transaction database
hoặc trừ nguyên liệu thật đã hoàn thành.

### Test Product API URL

File:

```text
apps/web/src/lib/products/url.test.ts
```

Đã bổ sung 7 test cho chuẩn hóa URL, cấu hình rỗng
và mã hóa ID trong đường dẫn.

### Kết quả đã ghi nhận

| Kiểm tra | Kết quả |
|---|---|
| Toàn bộ unit/HTTP test backend hiện có | 4 suites, 39/39 test đạt |
| Toàn bộ test frontend hiện có | 8 files, 49/49 test đạt |
| Build backend | Đạt |
| Build frontend | Đạt |
| Chạy thử trên trình duyệt | Đã kiểm tra luồng Menu → Detail → Giỏ hàng |

Cần lưu log lint và ảnh Network cùng minh chứng bàn giao.

## 6. Cấu hình frontend local

File: `apps/web/.env.local`.

```env
NEXT_PUBLIC_MENU_DATA_SOURCE=api
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=true
```

Khởi động lại frontend khi đổi biến môi trường.
Không đưa `.env`, `.env.local` hoặc mật khẩu vào commit.

## 7. Lệnh kiểm tra

Chạy tại thư mục gốc repository:

```powershell
npm run db:generate
npm run test -w apps/api -- --runInBand
npm run test -w apps/web
npm run lint
npm run build:api
npm run build:web
```

Chạy ứng dụng bằng hai Terminal riêng:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

Trang Menu:

```text
http://localhost:3000/menu
```

## 8. Đầu vào còn cần cho đợt 2

- Auth backend/JWT guard của TV5.
- Đọc schema và định lượng mẫu TV2 theo
  [tài liệu bàn giao database](TV2-sprint2-schema.md).
- InventoryService cập nhật nguyên liệu trong cùng transaction tạo đơn.
- Chính sách giữ, trừ và hoàn kho.
- Test PostgreSQL, rollback và chống oversell khi nhiều đơn đồng thời.
- Xác nhận migration Sprint 2 đã được áp dụng trước khi thử tạo đơn thật.

Suite PostgreSQL dùng bảng `Stock` theo sản phẩm cho callback
thử nghiệm. InventoryService đợt 2 dùng `Ingredient.stock`
và lưu lượng đã giữ vào `OrderIngredient`.
