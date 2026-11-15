# Kiểm tra luồng E2E — Task 2.1

Ngày rà soát: 15/11/2026. Phần của Triệu Phú Lâm. Task 1.1 được Lâm chuẩn bị toàn bộ theo phân công chung Lâm/Khoa.

## Phạm vi và kết luận

Bộ Activity có luồng mua hàng từ bắt đầu đến kết thúc: mở menu → chọn cấu hình → giỏ → xác thực nếu cần → tạo đơn/giữ nguyên liệu → thanh toán Mock → kết quả → lịch sử/chi tiết. ACT-00 là tổng quan; ACT-01–05 chi tiết các hoạt động được gọi. Lịch sử có thể mở độc lập, kể cả đơn chưa thanh toán.

Mỗi trang có điểm bắt đầu và các điểm kết thúc cho thành công, lỗi hoặc tạm dừng. Kết thúc một lần thử không đồng nghĩa đơn tự chuyển COMPLETED/CANCELLED. Kết quả chưa rõ kết thúc lần đối chiếu hiện tại ở trạng thái chờ, không tự suy thành thanh toán thất bại hoặc thành công.

## Kiểm tra cấu trúc nguồn draw.io

Đã kiểm tra lại XML trong gói: mọi node có nối luồng đều đi được từ initial; có đường đi tới final; không có đầu nối mất node; mọi decision nhiều nhánh đều có nhãn guard. Kiểm tra này xác minh cấu trúc đồ thị, không thay kiểm tra nghiệp vụ hoặc chạy ứng dụng.

| Trang | Node trong luồng | Control flow | Điểm kết thúc | Decision |
|---|---:|---:|---:|---:|
| ACT-00 | 18 | 18 | 4 | 4 |
| ACT-01 | 32 | 32 | 6 | 5 |
| ACT-02 | 25 | 26 | 4 | 5 |
| ACT-03 | 23 | 23 | 4 | 4 |
| ACT-04 | 27 | 29 | 4 | 5 |
| ACT-05 | 23 | 24 | 4 | 4 |

## Giới hạn đối chiếu mã nguồn

Mô hình dựa FR-01–FR-18 và baseline gốc f119683. Đã đọc lại main 4fb4f22 ngày 15/11/2026: checkout Mock vẫn có GAP-04: handleCheckStatus coi PENDING/PAYMENT_FAILED là failed và không chứng minh FAILURE thuộc đúng lần thử đang chờ. ACT-04 thể hiện điều kiện an toàn theo yêu cầu; chưa được dùng để kết luận code đã đáp ứng nhánh này. Không chạy lại tests trong lần đóng gói tài liệu.

Bộ này bao quát luồng E2E MVP Mock theo đầu vào đã có; không phải sơ đồ cho mọi chức năng mở rộng. Không mô hình hóa thu tiền thật, webhook PayOS, refund hoặc thao tác nhân viên như thể đã thuộc MVP. Việc nghiệm thu toàn bộ cần nhóm thống nhất SRS/UC/Sequence và xử lý các điểm trong activity-consistency-review.md.

## Định dạng

Nguồn chỉnh sửa: activity-order.drawio (6 tab, không chứa Class). Ảnh SVG/PNG giữ nguyên bản đã xuất từ draw.io ở lần trước; lần này chỉ tách tab Class khỏi file nguồn và sắp thư mục, không vẽ lại ảnh hoặc đổi luồng. Không có bản PlantUML Activity; không đổi đuôi draw.io thành puml.

## Hồ sơ đi kèm

- [Tổng quan và cách đọc](activity-order.md).
- [Quy tắc luồng](activity-flow-contract.md).
- [Đối chiếu từng AC](activity-ac-coverage.md).
- [Truy vết code/test](activity-traceability.md).
- [Điểm cần phối hợp](activity-consistency-review.md).
- [Task 1.1](../../requirements/task1.1/context-and-scope.md).
