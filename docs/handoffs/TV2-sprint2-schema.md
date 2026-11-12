# TV2 · Bàn giao database Sprint 2

Áp dụng migration `20261112000000_checkout_schema` sau migration catalog. Từ thư mục gốc, đặt `DATABASE_URL` trỏ tới PostgreSQL test của Assignment 2 rồi chạy:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed giữ ID, giá, tồn nguyên liệu và định lượng đã chỉnh. Migration `20261112010000_ingredient_inventory` bổ sung kho nguyên liệu vào sau schema đơn hàng. Hãy chạy seed sau migration để có nguyên liệu và công thức mẫu. Số tồn cũ trong `Stock` được giữ để các nhánh đang tích hợp đọc lại nếu cần.

## Hợp đồng schema cho TV3

- `Order.id`, `userId` và ID sản phẩm, size đều là chuỗi UUID. Đơn mới mặc định `PENDING`. `total` là tổng tiền VND do backend tính. `idempotencyKey` là tùy chọn và duy nhất theo `userId` khi có giá trị.
- `OrderItem` dùng `productId`, `productName`, `sizeId` và `sizeName` (hai trường size có thể rỗng), `toppings` dạng JSON, `quantity`, `unitPrice`, `lineTotal`. Tên, giá và topping được lưu theo thời điểm đặt. Lưu topping theo cấu trúc `{ id, name, price }`. Database yêu cầu số lượng 1–99 và `lineTotal = unitPrice × quantity`.
- `User.id` là khóa ngoại của đơn. Test tạo đơn cần tạo user test trước hoặc dùng tài khoản test từ API Auth của TV5.
- TV3 nối code local với các tên trường ở trên, chạy lại test tạo đơn và đọc lại `Order` kèm `items`. API chuyển trạng thái và phối hợp giữ tồn vẫn ở lớp nghiệp vụ.

## Hợp đồng cho TV1, TV4 và TV5

| Model | Dữ liệu cần dùng |
|---|---|
| `User` | `email` duy nhất, `name` tùy chọn, `passwordHash`, `role` mặc định `CUSTOMER`. |
| `Stock` | Tồn theo sản phẩm từ phiên bản trước. Dữ liệu khả dụng của luồng kho mới lấy từ `Ingredient.stock`. |
| `Ingredient` | Mã duy nhất, đơn vị `G`, `ML` hoặc `PIECE`, số lượng nguyên hiện có và `version` để TV4 kiểm tra cập nhật đồng thời. |
| `ProductSizeIngredient` | Định lượng cho một ly theo đúng `ProductSize.id`, gồm cả ly giấy. |
| `ProductToppingIngredient` | Định lượng bổ sung theo đúng `ProductTopping.id` được chọn. |
| `OrderIngredient` | Tổng lượng nguyên liệu đã giữ theo từng đơn và nguyên liệu. TV4 ghi cùng transaction tạo đơn, dùng lại lượng đã lưu khi hoàn kho. |
| `Payment` | Mỗi đơn có tối đa một bản ghi thanh toán thành công. Lưu phương thức và số tiền theo đơn đã được backend xác nhận. |
| `PaymentAttempt` | Lưu mỗi lần thử theo khóa ghép `orderId + idempotencyKey`. Có phương thức, số tiền và kết quả `SUCCESS` hoặc `FAILURE`. |

Enum phương thức mô phỏng trong schema dùng `MOCK_WALLET` và `MOCK_CARD`, cùng hai lựa chọn của UI. TV1 và TV6 thống nhất cách ánh xạ nếu API nhận tên khác. Xem thêm [bàn giao Cart UI và Checkout UI](TV2-sprint2-checkout.md).

## Cách đọc công thức và số ly bán được

Lấy `ProductSize.recipe` cho size đã chọn và `ProductTopping.recipe` cho từng topping đã chọn. Nếu hai dòng dùng cùng nguyên liệu, cộng định lượng của chúng. Với một ly, chia tồn hiện tại của từng nguyên liệu cho định lượng cần dùng và làm tròn xuống. Số ly khả dụng bằng giá trị nhỏ nhất trong các kết quả đó. Nếu thiếu công thức nền, xử lý như món chưa cấu hình kho.

Ví dụ Americano S dùng **18 g cà phê + 120 ml nước + 1 ly giấy**. Với tồn mẫu 1.000 g, 10.000 ml và 100 ly giấy, số ly khả dụng theo từng nguyên liệu là 55, 83 và 100, nên tối đa **55 ly**. Nếu chọn Trân châu, cộng thêm 30 g trân châu mỗi ly rồi tính lại.

Khi tạo đơn nhiều món, cộng lượng cần dùng theo từng mã nguyên liệu trên toàn đơn. Hai Americano S dùng 36 g cà phê, 240 ml nước và 2 ly giấy. Nếu tạo đơn thành công, lưu các lượng đó vào `OrderIngredient`. Khi hủy đơn, dùng số đã lưu để hoàn kho kể cả khi công thức hiện tại đã đổi. Phần đọc công thức, giữ và hoàn kho trong nghiệp vụ đặt đơn do TV4 phối hợp với TV3.

## Điểm nối giữa OrdersService và InventoryService

OrdersService gọi `options.reserveStock(tx, { orderId, items })` sau khi tạo đơn trong cùng transaction. `items` giữ nguyên từng dòng đã kiểm tra gồm `productId`, `sizeId`, `toppingIds` và `quantity`, để công thức từng dòng được tính đúng.

Commit TV4 `17b8c18` đã thêm `POST /api/orders` và token tiêm phụ thuộc `ORDER_STOCK_RESERVATION`. Tầng HTTP nhận đủ lựa chọn và chuyển tới OrdersService. Kiểu callback của token được lấy từ `CreateOrderOptions['reserveStock']`. Khi ghép InventoryService, TV4 đăng ký callback theo kiểu này. Controller hiện trả `503 ORDER_STOCK_NOT_READY` nếu chưa có callback và cần Auth backend của TV5 gắn người dùng đã xác thực vào request.

- **TV3:** Callback giữ kho chạy trong transaction tạo đơn và nhận được ID đơn vừa lưu. Nếu callback báo lỗi, đơn và các thay đổi kho phải cùng rollback.
- **TV4:** Dùng ID size và topping của từng dòng để đọc công thức. Cộng định lượng của toàn bộ đơn theo `ingredientId`, rồi trừ `Ingredient.stock` với điều kiện đủ tồn và phiên bản còn khớp. Dùng cùng `tx` để ghi `OrderIngredient`. Khi hủy hợp lệ, hoàn kho theo số đã lưu và bảo đảm một đơn chỉ được hoàn một lần. Với đơn cũ chưa có bản ghi nguyên liệu, dùng chính sách xử lý đơn cũ mà nhóm thống nhất.
- **Test khi ghép:** Đặt hai size hoặc topping khác nhau của cùng món và đối chiếu lượng giữ. Gửi đồng thời hai đơn khi chỉ đủ nguyên liệu cho một đơn, kiểm tra đơn bị từ chối không làm đổi kho. Đổi công thức sau khi đặt rồi hủy để kiểm tra hoàn đúng lượng đã lưu.

Suite PostgreSQL của TV3 vẫn dùng callback thử nghiệm cập nhật bảng `Stock` theo sản phẩm để kiểm tra transaction và idempotency. Để xác nhận luồng kho nguyên liệu, chạy test riêng qua InventoryService khi TV4 đã nối callback thật.
