# TV4 — Sprint 2, push lần 2

## Phần đã làm

- Nối InventoryModule vào OrdersModule.
- Dùng Ingredient.stock để quản lý tồn nguyên liệu.
- Tính nhu cầu theo công thức size và topping, nhân số lượng.
- Cộng nguyên liệu dùng chung giữa các dòng món và sản phẩm.
- Thiếu công thức trả 503 INGREDIENT_RECIPE_NOT_CONFIGURED.
- Thiếu tồn trả 409 INSUFFICIENT_INGREDIENT.
- Khóa nguyên liệu theo thứ tự bằng SELECT FOR UPDATE.
- Trừ tồn có điều kiện, tăng version và lưu OrderIngredient.
- Dùng cùng transaction tạo đơn: lỗi thì rollback toàn bộ.
- Replay cùng Idempotency-Key không giữ kho thêm lần nữa.
- Có hàm releaseStock hoàn theo snapshot, chống hoàn lặp.
- Thêm Order.stockReleasedAt và migration tương ứng.
- Bổ sung 9 unit test và 14 test PostgreSQL thật.

## Tích hợp hoàn nguyên liệu

releaseStock chỉ cho đơn CANCELLED chưa có Payment thành công.

Service điều phối hủy đơn cần kiểm tra quyền và điều kiện nghiệp vụ,
sau đó gọi chuyển trạng thái và releaseStock trong cùng transaction:

    await prisma.$transaction(async (tx) => {
      await ordersService.transitionStatus(orderId, 'CANCELLED', tx);
      await inventoryService.releaseStock(tx, orderId);
    });

Service gọi cần inject InventoryService từ InventoryModule.

Riêng transitionStatus của TV3 chưa tự hoàn kho.
Chưa thêm endpoint hủy đơn, cơ chế hết hạn giữ kho hoặc chính sách refund.
Đơn đã thanh toán và đơn cũ thiếu snapshot không tự động hoàn kho.

## Kiểm tra

- npm run db:generate
- npm run db:migrate
- npm run db:seed
- npm run build:api
- npm run test -w apps/api -- --runInBand
- npm run lint -w apps/api
- npm run test:inventory
- npm run test:inventory:postgres

Test PostgreSQL cần database local riêng tên brewlite_inventory_test
và biến BREWLITE_INVENTORY_TEST_DATABASE_URL trỏ vào database này.

## Kết quả trên bản được kiểm tra

- API unit test: 91/91, gồm 9 test kho mới.
- HTTP/PostgreSQL: 39/39, gồm 14 test kho mới.
- Build API, lint API, Prisma validate, migrate và seed đạt.
- 10 đơn đồng thời khi kho đủ 3: 3 thành công, 7 bị từ chối.
- 10 request cùng Idempotency-Key: 1 đơn, chỉ giữ kho một lần.
- Kiểm tra rollback, size/topping, payment replay và hoàn kho đồng thời.

Cần chạy lại các kiểm tra trên máy cá nhân sau khi copy code.