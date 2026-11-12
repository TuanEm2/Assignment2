# Bàn giao OrdersService Sprint 2

`OrdersModule` xuất `OrdersService` để TV4 nối controller và TV1 nối payment. Service dùng Prisma và schema Sprint 2 của TV2.

`createOrder(userId, input, options)` nhận ID khách từ phiên đăng nhập của TV5. Payload là `{ items: [{ productId, sizeId, toppingIds, quantity }] }`. ID lấy từ catalog, số lượng mỗi dòng từ 1 đến 99. Món có size cần chọn một size hợp lệ, món không có size dùng `null`. Dùng `[]` nếu không chọn topping.

Service đọc giá từ PostgreSQL, ghi đơn `PENDING` cùng tên món, size, topping, đơn giá và thành tiền lúc đặt. Phản hồi có ID, chủ đơn, trạng thái, tổng tiền, thời gian và các dòng món.

## Nối controller và tồn kho của TV4

Truyền `options.reserveStock(tx, requirements)` từ inventory service. Danh sách `requirements` đã cộng số lượng theo sản phẩm và sắp theo ID. Inventory dùng đúng `tx` được truyền. Khi giữ kho thất bại, lỗi thoát ra để rollback các dòng đơn và cập nhật tồn.

Có thể truyền `options.idempotencyKey` từ header của yêu cầu tạo đơn. Khóa dài 1–128 ký tự ASCII in được, không có khoảng trắng. Cùng khách, cùng khóa và cùng các dòng trả lại đơn đã lưu, kể cả khi hai yêu cầu chạy đồng thời. Cùng khóa nhưng đổi món hoặc số lượng trả `409`. Checkout giữ khóa khi gửi lại cùng yêu cầu.

## Chuyển trạng thái

`transitionStatus(orderId, next, tx?)` ghi trạng thái với điều kiện khớp ID và trạng thái cũ. Payment truyền cùng transaction với bước ghi nhận thanh toán. Controller hoặc payment service kiểm tra quyền trước khi gọi.

| Trạng thái hiện tại | Được chuyển sang |
| --- | --- |
| PENDING | PAYMENT_FAILED, PAID, CANCELLED |
| PAYMENT_FAILED | PAID, CANCELLED |
| PAID | PREPARING, CANCELLED |
| PREPARING | READY |
| READY | COMPLETED |
| COMPLETED, CANCELLED | Kết thúc |

Bảng này mở rộng luồng dự thảo TV6 theo enum TV2. Khi lần thử lại vẫn thất bại, payment ghi nhận lần thử và giữ `PAYMENT_FAILED`. Chính sách hoàn kho và hoàn tiền khi hủy cần nhóm xác nhận khi tích hợp. Payload sai trả `400`, dữ liệu không tồn tại trả `404`, trạng thái sai hoặc thay đổi đồng thời trả `409`.

## Kiểm thử

Đặt `DATABASE_URL` cho PostgreSQL test rồi chạy `npm run db:generate` và `npm run db:migrate`. Đặt thêm `BREWLITE_ORDERS_TEST_DATABASE_URL` trỏ tới cùng database test.

```powershell
npm run test -w apps/api -- --runInBand
npm run test:e2e -w apps/api -- --runInBand --runTestsByPath test/orders-postgres.e2e-spec.ts
```

Suite PostgreSQL dùng bảng thật, tạo và dọn dữ liệu riêng. Callback giữ kho trong suite dùng để thử transaction của TV3. Controller và inventory của TV4 cùng xác thực của TV5 là các đầu vào cần nối để mở `POST /api/orders`.
