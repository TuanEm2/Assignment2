# TV5 → TV6: nối History API thật

## Hợp đồng đã chạy với backend/database thật

- GET `/api/orders/me`: Bearer JWT; trả mảng, giữ tương thích OrdersView. Default 20 đơn, max 50; trang tiếp qua header `X-Next-Cursor`, client có thể đọc header vì đã expose CORS.
- GET `/api/orders/:id`: Bearer JWT; trả detail theo snapshot và Payment thật, items có unitPrice, subtotal/lineTotal, topping names và sizeName.
- GET `/api/orders/:id/status`: Bearer JWT; đọc Order.status đã lưu, không tự chuyển trạng thái. Payment API riêng của TV1 không bị sửa.
- Status hợp lệ theo enum thật gồm PENDING, PAYMENT_FAILED, PAID, PREPARING, READY, COMPLETED, CANCELLED.
- Token mất hiệu lực 401; đơn không có/không thuộc khách 404; ID/query sai 400; lỗi kho/DB không được biến thành đơn mẫu.

## Hai vấn đề UI có sẵn cần TV6 sửa trong đợt 2

Đối chiếu nền `afd9c92`, không phải lỗi phát sinh do History API:

1. `apps/web/src/app/orders/[id]/order-detail-content.tsx`: khi `!res.ok`, UI đang tạo object mẫu `{ total: 90000, status: 'PAID', ... }`. Phải bỏ fallback đó; 401 yêu cầu đăng nhập lại, 404 báo không tìm thấy/không có quyền, 5xx hiển thị lỗi và thử lại. Không hiển thị PAID do một request thất bại.
2. `apps/web/src/app/orders/orders-view.tsx`: khi `!res.ok`, UI đang setOrders([]) rồi return, khiến 401/500 hiện “chưa có đơn”. Phải phân biệt lỗi với response 200 `[]` thật. Bổ sung PAYMENT_FAILED và READY vào type/nhãn, xử lý page tiếp bằng cursor nếu muốn xem quá 20 đơn; state không còn hợp lệ sau logout/login sang tài khoản khác phải được xóa, tránh hiển thị dữ liệu cũ.

TV5 không sửa các component thuộc phần TV6 trong patch này để tránh xung đột và giữ đúng phân công. Đây là mục cần hoàn tất trước khi nghiệm thu toàn bộ giao diện lịch sử.

## Checklist nghiệm thu TV6

- Đăng nhập A → chọn món/size/topping/số lượng → POST order chỉ gửi ID và quantity → kho thật giữ nguyên liệu → thanh toán mock → History liệt kê đúng ID/tổng/status.
- Thất bại rồi retry khóa mới cho lần thanh toán mới; retry cùng attempt dùng cùng key; lịch sử đọc trạng thái hiện tại, không lấy response replay cũ làm nguồn trạng thái hiện tại.
- Đăng nhập B, mở URL đơn A → không hiện dữ liệu A, nhận 404. Token hết hạn → không hiện “PAID” hoặc “chưa có đơn”.
- List rỗng thật, loading, HTTP 401/404/500, lỗi mạng, đủ 7 status, item snapshot sau khi catalog thay đổi, phân trang, chuyển tài khoản không lộ state cũ.
- Viết component/browser E2E phù hợp; chỉ ghi kết quả chạy thật. 10 test History PostgreSQL của TV5 chứng minh backend và phối hợp dịch vụ, chưa thay cho test browser UI.

## Mục gửi nhóm trưởng cho TV1/TV4

`tsc --noEmit --incremental false` toàn API tại nền `afd9c92` có 7 lỗi kiểu ở test kho/payment; đã tái hiện trên worktree sạch trước patch. Runtime tests/lint/build vẫn qua. TV1/TV4 cần sửa annotation mock cho đúng tham số; không loại bỏ các assertions hay bỏ test để đạt typecheck.
