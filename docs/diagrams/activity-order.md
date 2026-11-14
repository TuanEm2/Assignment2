# Activity đặt và thanh toán đơn hàng — TV5

Trạng thái: đề xuất để review Task 2; chưa nghiệm thu khi SRS và UC checkout chưa được TV2/TV3 chốt.

- Nguồn: `activity-order.drawio`; hình xuất trực tiếp bằng File → Export as → SVG trong draw.io: `activity-order.svg`.
- Phạm vi: menu → chi tiết → giỏ → xác thực → tạo đơn → payment mock → kết quả/lịch sử.
- Swimlane: Khách hàng, Next.js UI, NestJS API. Database và payment thuộc các hành động API ở mức activity; sequence do TV6 thể hiện chi tiết lời gọi.
- Nhánh lỗi kết thúc lần thực hiện hiện tại, không có nghĩa người dùng không thể chỉnh thông tin rồi bắt đầu lại.
- Gửi yêu cầu hợp lệ vẫn phải kiểm tra JWT ở backend, kể cả UI thấy có phiên đăng nhập.
- Thất bại đã xác định và mất phản hồi là hai trường hợp khác nhau: không tạo giao dịch mới khi chưa biết kết quả cũ.
- Policy giữ/hoàn kho khi payment thất bại cần TV1/TV3/TV4 chốt. Sơ đồ không tự giả định thất bại thanh toán sẽ hoàn kho.
- Mã FR/NFR: chờ SRS TV2. Luồng UC: chờ đặc tả checkout TV3. Không tự đặt mã chính thức.

## Review cần phối hợp

1. TV3 xác nhận UC, tạo đơn, state machine và transaction.
2. TV4 xác nhận inventory chạy trong cùng transaction tạo đơn.
3. TV1 xác nhận contract payment, idempotency và retry.
4. TV2/TV6 xác nhận UI, điều phối checkout và cách xử lý giỏ sau PAID.
5. TV5 xác nhận JWT, ownership và các lỗi không làm lộ dữ liệu đơn.

Không dùng tài liệu này làm bằng chứng ứng dụng đã hiện thực hoặc E2E đã chạy đạt.

## Quy ước UML và kiểm tra nguồn

- Đây là Activity Diagram, không dùng hình actor/oval của Use Case hoặc lifeline của Sequence.
- Initial node: chấm tròn đen. Activity final: chấm đen nằm trong vòng tròn rỗng.
- Action: hình chữ nhật bo góc; tên hành động bắt đầu bằng động từ.
- Decision và merge: hình thoi; decision có điều kiện gác trong `[...]`, merge hợp các nhánh thay thế. Không dùng fork/join vì chưa có hoạt động song song độc lập cần mô tả.
- Control flow: nét liền, mũi tên mở; đường nối vuông góc. Swimlane phân định chủ thể thực hiện.
- Đăng nhập/đăng ký là hành động tổng hợp; lỗi xác thực quay qua merge trước khi nhập lại. Tạo đơn lỗi kết thúc lần yêu cầu, không kết luận người dùng bị cấm chỉnh giỏ rồi gửi yêu cầu mới.
- Phân biệt PAYMENT_FAILED đã xác định với kết quả chưa rõ do mất phản hồi. Khi chưa rõ, giữ khóa để kiểm tra hoặc gửi lại cùng yêu cầu; không coi đó là một lần thanh toán mới.
- Ảnh SVG có nhúng bản sao sơ đồ. File `.drawio` chứa các shape/connector có thể chọn, sửa nhãn và di chuyển trong draw.io; không phải ảnh raster đặt vào canvas.

## Cách kiểm tra và cập nhật

1. Mở draw.io, chọn File → Open from → Device, mở `activity-order.drawio`.
2. Đối chiếu từng hành động và guard với SRS/UC được nhóm duyệt; cập nhật các điểm còn chờ nêu ở trên.
3. Kiểm tra nút bắt đầu/kết thúc, merge, trách nhiệm từng lane và hướng mũi tên. Không suy ra chỗ giao hai đường là một nút nối.
4. Lưu nguồn `.drawio`; xuất SVG với Size = Diagram, Zoom = 100%, Include a copy of my diagram bật.
5. Không đổi đuôi HTML thành SVG. SVG thật phải có phần tử gốc `<svg>` và mở được độc lập.

Chưa có mã FR/NFR chính thức và đặc tả thanh toán cuối cùng; bản này chưa được coi là nghiệm thu nghiệp vụ. Sơ đồ mô tả thiết kế dự kiến, không phải chứng cứ toàn bộ chức năng đã được cài đặt.
