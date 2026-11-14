# TV2 · Database menu Sprint 1

Phần Task 4.3 và 5.2 của TV2 cung cấp cấu trúc PostgreSQL, migration và dữ liệu mẫu cho API sản phẩm của TV3 và menu của TV4.

## Dựng database local

Tạo database PostgreSQL rỗng cho Assignment 2. Ở thư mục gốc, sao chép `.env.example` thành `.env` nếu chưa có, rồi đặt `DATABASE_URL` trỏ tới database đó. Cấu hình Prisma đọc `.env` gốc và dùng biến môi trường của tiến trình nếu đã được truyền sẵn.

```powershell
npm ci
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` áp dụng các migration đã commit. `db:seed` bổ sung bốn sản phẩm mẫu, mỗi món có ba size S/M/L và hai lựa chọn topping. Chạy lại seed sẽ giữ ID, giá và dữ liệu đã có nhờ khóa duy nhất và nhánh `update: {}`.

## Dữ liệu cho API và giỏ hàng

| Model | Trường cần dùng |
|---|---|
| `Product` | `id` UUID dạng chuỗi, `slug`, `name`, `price` giá gốc, `imageUrl`, quan hệ `sizes` và `toppings`. |
| `ProductSize` | `id` UUID dạng chuỗi, `productId`, `name` S/M/L, `price` phụ thu. |
| `ProductTopping` | `id` UUID dạng chuỗi, `productId`, `name`, `price` phụ thu. |

Tất cả giá là số nguyên VND từ 0 trở lên. Khoá ghép `productId + name` chặn lặp size hoặc topping trong cùng sản phẩm. TV3 có thể lấy `sizes` và `toppings` khi truy vấn chi tiết món. Khi chuyển sang giỏ, frontend ánh xạ `Product.id` sang `productId`, `Product.name` sang `productName`, và `Product.price` sang `basePrice`. Dữ liệu tùy chọn dùng cấu trúc `{ id, name, price }` của cart store TV1. Đường dẫn `/images/products/...` dùng tài nguyên trong `apps/web/public`.

Ví dụ Americano M + Trân châu có giá tạm tính 40.000 + 5.000 + 5.000 = **50.000 ₫/ly**. Ở Sprint 2, backend tính lại giá từ database khi tạo đơn. Thiết kế và xử lý tồn kho sẽ được thống nhất với TV4 trước khi ghép đặt đơn.
