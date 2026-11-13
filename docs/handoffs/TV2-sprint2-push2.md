# TV2 · Sprint 2, push đợt 2

Nhánh `feature/tv2-cart` tại `041cc6f` đã chứa toàn bộ lịch sử `feature/tv1-devops` đến `5f4214b`. Lần cập nhật này tiếp tục từ `041cc6f`.

## Thay đổi

| File | Nội dung |
| --- | --- |
| `apps/web/src/app/cart/cart-view.tsx` | Bản `041cc6f` cho tên món và topping dài xuống dòng, giữ tóm tắt giỏ khi cuộn trên màn hình rộng. |
| `apps/web/src/app/cart/cart-view.test.tsx` | Kiểm tra giới hạn 1–99, xóa món, giỏ trống, các dòng cùng món khác size/topping. Bổ sung kiểm tra nhiều món và nhiều topping trong cùng giỏ, tính lại tổng và chỉ cập nhật dòng được chọn. |
| `apps/web/src/app/checkout/checkout-screen.tsx` | Khóa gửi lặp tại giao diện. Giữ màn hình xử lý và nút kiểm tra trạng thái khi đơn đang chờ kết quả mà giỏ đã rỗng. Dùng hook hiện có của TV6. |
| `apps/web/src/app/checkout/checkout-view.tsx` | Khóa thao tác khi thanh toán hoặc kiểm tra trạng thái. Hai phương thức xếp dọc trên điện thoại và cạnh nhau trên màn hình rộng. |
| `apps/web/src/app/checkout/checkout-view.test.tsx` | Bao phủ review, processing, failed, unknown và paid. Kiểm tra gửi lặp, giữ nút kiểm tra khi giỏ rỗng và hiển thị tổng tiền xác nhận từ API. |

## Kiểm thử đã qua

- `npm test` đạt 62 test frontend và 82 unit test backend. Lint và build đạt ở cả hai workspace.
- `npm run test:e2e -w apps/api -- --runInBand` đạt 24 test HTTP và PostgreSQL trên database thử nghiệm `brewlite_test`.
- `npm run test:cart` đạt 5 test. `npm run test:integration` đạt 4 test hợp đồng.
- Edge ở 320, 390 và 1280 px không bị tràn ngang khi có tên món/topping dài. Kiểm tra nút tăng ở 99 và bố cục phương thức thanh toán. Với phản hồi API giả lập, gửi lặp chỉ tạo một yêu cầu đặt đơn, Checkout kiểm tra trạng thái sau lỗi 502 và hiển thị tổng tiền do API xác nhận.
- Prisma generate, validate và cả 3 migration chạy thành công trên PostgreSQL thử nghiệm mới. Seed hai lần vẫn có 4 món, 9 nguyên liệu, 42 định lượng theo size và 8 định lượng theo topping. Americano S dùng 18 g cà phê, một phần trân châu dùng 30 g.
- PostgreSQL xác nhận một đơn có tối đa một `Payment` và có nhiều `PaymentAttempt`. Trùng khóa lần thử trong cùng đơn bị từ chối, cùng khóa trên hai đơn khác nhau được chấp nhận. Cả `Payment` lẫn `PaymentAttempt` đều từ chối tham chiếu đơn không tồn tại.

## Điểm cần tích hợp

- TV4 đăng ký hàm giữ nguyên liệu trong transaction tạo đơn. API hiện trả `503 ORDER_STOCK_NOT_READY` khi hàm này chưa được nối.
- TV6 hoàn thiện điều phối và chạy end-to-end từ menu đến xác nhận đơn với API thật. Các kiểm thử trình duyệt của TV2 dùng phản hồi API giả lập để kiểm tra hành vi giao diện.
