> Cập nhật Sprint 2 đợt 1: đã nhận User/Order schema và Auth đã nối Prisma, mount trong AppModule; xem `TV5-sprint2-push1.md`. Nội dung phía dưới ghi trạng thái lúc chuẩn bị Sprint 1. History vẫn dành cho đợt 2.

# TV5 — Ranh giới công việc và đầu vào tích hợp

Nền đầu: `feature/tv1-devops`, commit `46ed650`. Đã cập nhật fast-forward cục bộ tới `origin/feature/tv4-menu-stock` tại `9862594`, chứa catalog TV2 và API TV3. Nhánh TV5: `feature/tv5-auth-detail`.
Không nhập source/lịch sử hoặc kết quả test Assignment 1 vào Assignment 2.

## Phần TV5 sở hữu

- Activity đặt hàng end-to-end: nguồn và SVG.
- Product Detail UI: tải dữ liệu, chọn size/topping, tính giá hiển thị, thêm giỏ qua store TV1; component tests.
- Backend register/login: validate, hash mật khẩu, JWT và guards; tests.
- API lịch sử, chi tiết, trạng thái đơn thuộc tài khoản hiện tại; projection không lộ passwordHash/secret/dữ liệu tài khoản khác; tests.
- Cung cấp mapping yêu cầu → code → test và minh chứng cho TV2/TV6.

Không viết lại Cart Store/payment TV1, schema TV2, OrdersService TV3, InventoryService TV4 hoặc Auth/History UI của TV6.

## Đã xác nhận từ code TV1

- `apps/web/src/stores/cart-store.ts`: `addItem(input)`.
- `productId` là string trong CartLine; lựa chọn có `id`, `name`, `price`; `size` có thể null ở store tổng quát.
- Giá client chỉ dùng hiển thị; backend phải tính lại.
- Đã có schema catalog và `GET /api/products/:id`; contract ở `docs/api/products.md`.
- Chưa có User/Order schema, SRS hoặc Auth/Orders API trên các nhánh đã kiểm tra.

## Các đầu vào cần nhóm chốt

| Owner | Đầu vào | Ảnh hưởng TV5 |
|---|---|---|
| TV2 | SRS và FR/NFR; User/Order/Item schema và migration | Mapping UML; DB adapter và projection đơn |
| TV3 | Product API đã có UUID, sizes/toppings; còn thiếu trạng thái tồn kho | Detail đã dùng contract; chưa thể khóa theo hết hàng |
| TV3/TV4 | OrdersService/Controller, transaction, status | Gắn routes lịch sử/chi tiết, tránh trùng controller |
| TV6 | Auth response mong muốn, token storage/redirect | Form UI tương thích Auth API TV5 |
| TV1 | Prefix API, ENV và payment contract | Đường gọi API và retry trong Activity |

## Đề xuất contract để review, chưa phải API đã hiện thực

- `POST /api/auth/register`: email/password; không trả passwordHash.
- `POST /api/auth/login`: email/password; trả accessToken, tokenType, expiresIn và user công khai.
- `GET /api/orders/me`: JWT; dữ liệu lọc theo user từ token, không nhận userId để chọn chủ đơn.
- `GET /api/orders/:id`: JWT; kiểm tra ownership; không trả dữ liệu đơn người khác.
- Route `/me` khai báo trước route `/:id`. API detail dùng trạng thái đơn hiện có; không tạo route cho khách tự gán PAID.
- Kiểu ID, field DTO và mã HTTP phải chốt theo SRS/contract và schema trước khi viết adapter PostgreSQL.

## Những kiểm tra phải có khi triển khai

Auth: email sai/trùng, mật khẩu sai, token thiếu/sai/hết hạn; response không có passwordHash.
Orders: hai tài khoản; tài khoản B không thấy đơn của A, kể cả biết ID; trạng thái và tiền lấy từ DB.
Detail: loading/404/error, lựa chọn hợp lệ, tổng cập nhật, payload đúng store; không thêm khi chưa tải xong hoặc hết hàng.
Chạy test, lint/typecheck/build; E2E qua DB thử nghiệm phối hợp TV6. Không báo hoàn thành khi mới có đề xuất contract.
