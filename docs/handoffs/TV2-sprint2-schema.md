# TV2 · Bàn giao database Sprint 2

Áp dụng migration `20261112000000_checkout_schema` sau migration catalog. Từ thư mục gốc, đặt `DATABASE_URL` trỏ tới PostgreSQL test của Assignment 2 rồi chạy:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed giữ ID, giá và tồn hiện có. Mỗi sản phẩm mẫu chưa có dòng `Stock` được khởi tạo 100 ly. Database đã có dữ liệu vẫn giữ catalog cũ khi áp dụng migration. Tồn đang được mô hình hóa theo sản phẩm, dùng chung giữa các size. Bảng này cung cấp số lượng và phiên bản để TV4 cập nhật tồn trong cùng transaction tạo đơn.

## Hợp đồng schema cho TV3

- `Order.id`, `userId` và ID sản phẩm, size đều là chuỗi UUID. Đơn mới mặc định `PENDING`. `total` là tổng tiền VND do backend tính. `idempotencyKey` là tùy chọn và duy nhất theo `userId` khi có giá trị.
- `OrderItem` dùng `productId`, `productName`, `sizeId` và `sizeName` (hai trường size có thể rỗng), `toppings` dạng JSON, `quantity`, `unitPrice`, `lineTotal`. Tên, giá và topping được lưu theo thời điểm đặt. Lưu topping theo cấu trúc `{ id, name, price }`. Database yêu cầu số lượng 1–99 và `lineTotal = unitPrice × quantity`.
- `User.id` là khóa ngoại của đơn. Test tạo đơn cần tạo user test trước hoặc dùng tài khoản test từ API Auth của TV5.
- TV3 nối code local với các tên trường ở trên, chạy lại test tạo đơn và đọc lại `Order` kèm `items`. API chuyển trạng thái và phối hợp giữ tồn vẫn ở lớp nghiệp vụ.

## Hợp đồng cho TV1, TV4 và TV5

| Model | Dữ liệu cần dùng |
|---|---|
| `User` | `email` duy nhất, `name` tùy chọn, `passwordHash`, `role` mặc định `CUSTOMER`. |
| `Stock` | Khóa chính `productId`, `quantity` và `version` không âm. TV4 dùng `version` và điều kiện đủ tồn khi cập nhật đồng thời. |
| `Payment` | Mỗi đơn có tối đa một bản ghi thanh toán thành công. Lưu phương thức và số tiền theo đơn đã được backend xác nhận. |
| `PaymentAttempt` | Lưu mỗi lần thử theo khóa ghép `orderId + idempotencyKey`. Có phương thức, số tiền và kết quả `SUCCESS` hoặc `FAILURE`. |

Enum phương thức mô phỏng trong schema dùng `MOCK_WALLET` và `MOCK_CARD`, cùng hai lựa chọn của UI. TV1 và TV6 thống nhất cách ánh xạ nếu API nhận tên khác. Xem thêm [bàn giao Cart UI và Checkout UI](TV2-sprint2-checkout.md).
