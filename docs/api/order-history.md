# TV5 — Order History API, Sprint 2 đợt 2

Nền: `feature/tv4-menu-stock` tại `afd9c929f88259d031bcccfc33819109b2094cda`.
Auth của TV5 tại `7f1b11c` đã nằm trong nền này. `OrderHistoryModule` được mount trong AppModule; không cần adapter thử nghiệm hoặc sửa schema.

## Quyền truy cập

Tất cả route bên dưới yêu cầu `Authorization: Bearer <accessToken>` thật. Guard kiểm tra chữ ký, issuer, audience, hạn token, UUID subject và tài khoản còn tồn tại. Chủ đơn lấy từ CurrentUser, không lấy userId/role do client gửi.

Mọi truy vấn Order đều lọc `userId` ngay trong SQL. Route dành cho khách hàng không có quyền xem đơn người khác, kể cả tài khoản có role ADMIN. Không thay thế bằng ẩn nút ở UI. Đơn không tồn tại và đơn thuộc người khác trả cùng `404 Order not found`; token thiếu/sai/hết hạn trả 401.

## GET /api/orders/me

Response 200 là **mảng**, phù hợp OrdersView của TV6:

```json
[
  {
    "id": "<UUID>",
    "status": "PAID",
    "total": 96000,
    "createdAt": "2026-11-13T00:00:00.000Z",
    "updatedAt": "2026-11-13T00:01:00.000Z",
    "itemCount": 2
  }
]
```

- Không có đơn: `[]`, không giả lập dữ liệu.
- `limit`: chuỗi số nguyên 1–50, mặc định 20. Không chấp nhận tham số lạ như userId hoặc limit lặp.
- `cursor`: UUID đơn cuối trang trước. Cursor phải tồn tại và thuộc tài khoản hiện tại; cursor không hợp lệ/không thuộc khách/không còn tồn tại trả 400.
- Sắp xếp `createdAt DESC, id DESC`; keyset pagination dùng cả thời gian và UUID, không dùng offset.
- Header `X-Next-Cursor`: UUID để gọi `?limit=20&cursor=<UUID>`, chuỗi rỗng khi hết trang. Header được expose cho fetch khác origin.
- Header `Cache-Control: private, no-store` cho mọi response thành công.
- itemCount là tổng quantity các dòng, không phải số dòng.
- Nếu dữ liệu thay đổi giữa hai lần đọc, đây không phải snapshot transaction xuyên nhiều request. Đơn mới hơn cursor được thấy khi tải lại trang đầu; cursor bị xóa trả 400 để UI tải lại.

## GET /api/orders/:id

Response có `id, status, total, createdAt, updatedAt, items, payment`.

Mỗi item có `id, productId, productName, sizeName` (có thể null), `toppings` (mảng tên), `quantity, unitPrice, lineTotal, subtotal`. `subtotal` là alias của lineTotal để tương thích hợp đồng UI TV6. Giá/tên/size/topping lấy từ snapshot đã lưu trong OrderItem, không tính lại theo Product hiện tại.

`payment` là null khi chưa có Payment; khi đã thanh toán có `id, method, amount, createdAt` được đọc từ bản ghi thật. Không trả passwordHash, user/email/role, khóa idempotency, lịch sử attempts hoặc lượng nguyên liệu nội bộ. Các giá trị tiền là số nguyên VND.

## GET /api/orders/:id/status

Response có `id, status, total, updatedAt`. Chỉ đọc trạng thái Order đã lưu, không đánh dấu PAID và không thay thế Payment API của TV1. Cùng kiểm tra ownership và UUID như detail. Route này không phụ thuộc PAYMENT_MODE; GET trạng thái mock của TV1 vẫn giữ hợp đồng cũ riêng.

## Lỗi và giới hạn

- 400: ID/query/cursor không hợp lệ.
- 401: không có phiên hợp lệ hoặc tài khoản đã xóa.
- 404: không thấy đơn thuộc chủ hiện tại.
- 500: storage lỗi; API không đổi lỗi thành lịch sử rỗng hoặc đơn mẫu đã PAID.
- Các route GET không ghi Order/Payment/Stock/Ingredient, không chuyển trạng thái, hoàn kho hoặc tạo thanh toán.
- Module này không thêm route hủy đơn, refund, logout/revoke token, reset mật khẩu hoặc quyền quản trị đơn.

## Kiểm thử

- `src/order-history/order-history.service.spec.ts`: truy vấn có owner, giới hạn trang, cursor, snapshot/projection, 404 và lỗi database.
- `test/history-postgres.e2e-spec.ts`: HTTP + JWT/hash thật + Prisma/PostgreSQL thật, hai tài khoản, thiếu/sai/hết hạn JWT, quyền ADMIN không vượt ownership, empty/list/detail/status, phân trang trùng thời gian, create order + reserve stock + failed/retry/success/replay payment, giữ snapshot khi catalog đổi và GET không ghi dữ liệu.
- Bộ PostgreSQL cần `BREWLITE_HISTORY_TEST_DATABASE_URL` trỏ database local riêng có `_test` trong tên; thiếu ENV thì fail, không bỏ qua test. Dữ liệu test gắn UUID riêng, chỉ dọn fixture của lượt chạy; không seed/reset/xóa dữ liệu toàn DB.
