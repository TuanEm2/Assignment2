# TV2 · Sprint 2, push đợt 2

Bản này lấy nền `feature/tv1-devops` tại `5f4214b` bằng fast-forward. TV3 lấy tiếp `feature/tv2-cart` khi đến lượt.

## Thay đổi

| File | Nội dung |
| --- | --- |
| `apps/web/src/app/cart/cart-view.tsx` | Tên món và topping dài tự xuống dòng. Tóm tắt giỏ bám theo khi cuộn trên màn hình rộng. |
| `apps/web/src/app/cart/cart-view.test.tsx` | Kiểm tra nút tăng khóa ở 99, nút giảm khóa ở 1, các dòng tách theo size/topping, cập nhật tổng sau khi đổi số lượng hoặc xóa món và trạng thái giỏ rỗng. |
| `apps/web/src/app/checkout/checkout-view.tsx` | Hai phương thức xếp dọc trên điện thoại, đặt cạnh nhau trên màn hình rộng. Nút kiểm tra trạng thái báo đang chờ và khóa trong lúc gọi API. |
| `apps/web/src/app/checkout/checkout-screen.tsx` | Khóa gửi lặp ở lớp giao diện, kể cả hai lần submit trước khi màn hình kịp chuyển trạng thái. Dùng hook hiện có của TV6. |
| `apps/web/src/app/checkout/checkout-view.test.tsx` | Kiểm tra review, processing, failed, unknown và paid. Mô phỏng gián đoạn khi gọi thanh toán, kiểm tra trạng thái rồi hiển thị số tiền API xác nhận. |

## Kiểm thử đã qua

- Frontend lint, build và 61 test trong 10 bộ.
- Backend lint, build, 82 unit test và 24 test API E2E, trong đó các bộ Auth và Orders dùng PostgreSQL thử nghiệm.
- Edge ở 320, 390 và 1280 px với tên món/topping dài, tăng số lượng đến 99 và luồng Checkout xác nhận lại trạng thái sau khi mất phản hồi. Bài kiểm tra trình duyệt dùng phản hồi API giả lập.
- 5 test tính giỏ và 4 test hợp đồng tích hợp.
- Prisma generate, validate và cả 3 migration trên PostgreSQL thử nghiệm mới.
- Seed hai lần cho kết quả 4 món, 9 nguyên liệu, 42 định lượng theo size và 8 định lượng theo topping. Kiểm tra mẫu Americano S dùng 18 g cà phê và Trân châu dùng 30 g mỗi phần.
- PostgreSQL kiểm tra đơn liên kết một `Payment` và nhiều `PaymentAttempt`, từ chối bản ghi thanh toán thứ hai của cùng đơn, từ chối trùng khóa lần thử trong cùng đơn và từ chối bản ghi tham chiếu đơn không tồn tại. Hai đơn có thể dùng cùng chuỗi khóa lần thử.

## Điểm cần tích hợp

- TV4 đăng ký hàm giữ kho trong transaction tạo đơn. API hiện có thể trả `503 ORDER_STOCK_NOT_READY` cho tới khi có hàm này.
- TV6 hoàn thiện điều phối và kiểm thử end-to-end từ menu đến xác nhận đơn. Hook checkout và hợp đồng database dùng theo bản của nhóm.
