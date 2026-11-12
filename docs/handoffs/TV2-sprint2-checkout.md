# TV2 · Bàn giao giao diện giỏ hàng và checkout

- `/cart` dùng trực tiếp Zustand store TV1. Tạm tính lấy từ store, điều hướng sang `/checkout`.
- `CheckoutScreen` đọc phiên đăng nhập của TV6, đưa khách chưa đăng nhập đến `/login?redirect=/checkout`. Nhánh mặc định khi chưa nối API chỉ hiển thị bước xem lại và khóa nút xác nhận.
- `CheckoutView` nhận `items`, `subtotal`, `state`, `onPay(method)` và `onCheckStatus()`. TV6 truyền state từ luồng điều phối và nối callback với API khi các endpoint sẵn sàng. Giá do backend trả nên truyền qua `state.orderTotal`.
- Giao diện phát ra hai lựa chọn `MOCK_WALLET` và `MOCK_CARD`. TV6 ánh xạ hai lựa chọn này sang mã API do TV1 chốt.
- `processing` khóa các lựa chọn trong lúc chờ. `failed` cho thử lại. `unknown` chỉ cho kiểm tra trạng thái. Khi đã có phản hồi thành công, truyền `{ phase: 'paid', orderId, orderTotal }` và tiếp tục render màn xác nhận kể cả sau khi xóa giỏ.
- TV6 chịu trách nhiệm giữ khóa cho lần gửi lại chưa rõ kết quả và chỉ xóa giỏ tương ứng sau khi backend xác nhận thành công.

Chạy test giao diện bằng `npm run test -w apps/web`. Test xác nhận hành vi của component với phản hồi giả lập. E2E thực tế cần Auth, Orders và Payment API của các thành viên phụ trách.
