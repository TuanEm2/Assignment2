# Hợp đồng luồng Activity BrewLite — v1.1

## 1. Căn cứ và cách xử lý khác biệt

- Yêu cầu bắt buộc lấy từ đề Assignment 2, Task 1.1 và 2.1; hành vi chi tiết lấy FR/AC của Huy. Không dùng lỗi code làm yêu cầu mới.
- Use Case/Sequence của Trần Ân dùng để kiểm tra phối hợp và giữ tên chức năng; điểm chưa khớp được nêu riêng để tránh âm thầm chọn một bản rồi coi tất cả đã thống nhất.
- Code `main f119683` dùng đối chiếu khả năng hiện có và hợp đồng API, không dùng thay việc đặc tả nghiệp vụ.
- Bộ Activity là thiết kế theo yêu cầu. Trong ACT-04, “backend xác nhận FAILURE đúng lần thử” là điều kiện phục hồi an toàn; status đơn đơn thuần hiện chưa chứng minh điều đó.
- Không phát sinh mã FR/NFR/UC chính thức mới. ACT/SH/ASM/CON/RSK là mã của tạo phẩm; alias UC giữ theo đầu vào.

## 2. Tiền điều kiện và hậu điều kiện

| Trang | Tiền điều kiện | Hậu điều kiện thành công | Hậu điều kiện lỗi/dừng |
|---|---|---|---|
| ACT-00 | Khách mở ứng dụng; có thể chưa đăng nhập | Hoàn tất đặt/thanh toán và có thể đọc đơn | Giữ giỏ khi chưa xác nhận thanh toán; không tự gán PAID |
| ACT-01 | Có kết nối API hoặc nhận lỗi tải có thể xử lý | Giỏ giữ cấu hình hợp lệ và tạm tính | Chưa thêm lựa chọn sai; menu/detail lỗi có thông báo; giỏ rỗng không checkout |
| ACT-02 | API Auth được cấu hình; có dữ liệu đăng ký/đăng nhập | Login cấp JWT, API bảo vệ xác minh JWT và tài khoản | Không cấp phiên khi sai dữ liệu/tài khoản; token lỗi không cho thực hiện nghiệp vụ |
| ACT-03 | Có giỏ và phiên; API tự kiểm tra lại | Đơn PENDING, snapshot và tồn được commit nguyên tử hoặc replay đơn cũ | Lỗi trước commit không để dữ liệu dở dang; mất phản hồi cần đối chiếu/replay cùng khóa |
| ACT-04 | Có đơn sở hữu; mock mode bật; key được giữ trong phiên | Payment thành công xác nhận từ backend; giỏ được xóa | FAILURE giữ giỏ; unknown giữ key và chặn lần thanh toán mới; không hoàn kho ngầm |
| ACT-05 | Có phiên; không bắt buộc đã trả tiền | Đọc đúng đơn sở hữu hoặc danh sách rỗng thật | Không hiển thị dữ liệu đơn người khác; không thay status/kho |

ACT-05 có thể mở độc lập cho đơn PENDING/PAYMENT_FAILED; đường sau PAID trong ACT-00 chỉ là luồng mua thành công tiêu biểu, không phải điều kiện cho phép xem lịch sử.

## 3. Quy tắc chi tiết của hành động

| Quy tắc | Nội dung / điều kiện rẽ nhánh | FR/AC |
|---|---|---|
| BR-01 | Menu thành công dùng dữ liệu API, tên/giá đúng; ảnh lỗi có hình thay thế. Loading/rỗng/lỗi phân biệt; không tự chuyển demo khi API lỗi | FR-01 |
| BR-02 | Tìm không dấu/case; không có kết quả hiển thị thông báo, xóa lọc trả danh sách đầy đủ. Category chỉ áp dụng khi dữ liệu cấp trường category | FR-02 |
| BR-03 | Detail hiển thị giá gốc/tùy chọn; size bắt buộc hợp lệ; quantity nguyên 1–99. Tạm giá = (base + size + tổng topping) × quantity | FR-03, FR-05 |
| BR-04 | Khóa dòng giỏ dùng product + size + tập topping chuẩn hóa thứ tự; khác cấu hình là dòng khác; cùng cấu hình cộng tối đa 99. Persist cùng trình duyệt; sửa/xóa tính lại tổng | FR-04–05 |
| BR-05 | availableCups = min floor(stock / tổng nhu cầu nguyên liệu cho một ly). Cộng nhu cầu dùng chung trước khi chia. Ước tính đọc không trừ kho; vượt giá trị đã biết thì chặn thêm, unknown vẫn backend kiểm tra lúc đặt | FR-17 |
| BR-06 | Register email chuẩn hóa/unique; tên tùy chọn; mật khẩu 12–128, không trim mật khẩu; xác nhận khớp tại UI; API từ chối trường ngoài hợp đồng, hash scrypt có salt và không trả hash | FR-06 |
| BR-07 | Login kiểm tra tại API, trả JWT hợp lệ có hạn dùng và user công khai. Login không bắt buộc mật khẩu lại phải dài ≥12. JWT thiếu/sai/hết hạn hoặc user không còn tồn tại không được gọi nghiệp vụ bảo vệ | FR-07 |
| BR-08 | Chủ đơn lấy JWT. Client chỉ gửi IDs/quantity, không gửi total/price/status/userId. API validate cấu hình thuộc đúng sản phẩm; số tiền tính từ catalog tại lúc tạo | FR-08–09 |
| BR-09 | Snapshot tên, size, toppings, quantity, unitPrice, lineTotal và total được dùng cho lịch sử; không tính lại theo giá catalog sau đó | FR-09, FR-16 |
| BR-10 | Một transaction bao trùm Order/OrderItem, giữ nguyên liệu và OrderIngredient. Cộng nhu cầu chung, khóa theo thứ tự, trừ có điều kiện; chỉ trả thành công sau commit. Lỗi rollback; thiếu tồn 409, thiếu recipe 503 | FR-10 |
| BR-11 | Nhiều khách không phải fork/join của một phiên. Kiểm soát nguyên tử đảm bảo tổng lượng giữ không vượt tồn. Minh chứng 10 request/capacity3 cần test DB; sơ đồ không thay test | FR-11 |
| BR-12 | Order key tùy chọn ở API, frontend có gửi. Cùng chủ+key+payload replay không tạo/trừ thêm; khác payload 409; đồng thời cùng key chỉ một đơn; key sai400. Mất phản hồi không đổi key mù quáng | FR-12 |
| BR-13 | Mock Wallet/Card chỉ bật mock; outcome client chỉ phục vụ mô phỏng. Amount lấy Order. SUCCESS ghi Payment+Attempt và PAID; FAILURE ghi Attempt và PAYMENT_FAILED; commit nguyên tử; replay không ghi thêm | FR-13 |
| BR-14 | FAILURE rõ ràng của lần hiện tại: giữ order key/đơn khi giỏ không đổi, payment key mới. Unknown: giữ cả giỏ/key, chặn gửi mới, yêu cầu đối chiếu. Không dựa trạng thái cũ để kết luận lần thử đang chờ | FR-14 |
| BR-15 | Chỉ xóa giỏ khi backend xác nhận có Payment thành công. PENDING/PAYMENT_FAILED đơn thuần không đủ chứng minh yêu cầu vừa bị mất phản hồi đã hoàn tất | FR-14 |
| BR-16 | History lọc owner trước phân trang; createdAt DESC,id DESC; default20, limit1–50; cursor hợp lệ trong phạm vi owner; array response và X-Next-Cursor. Empty thật, không dùng đơn PAID mẫu | FR-15, FR-18 |
| BR-17 | Detail/status dùng JWT và UUID; cùng lọc id+userId. Missing/foreign404, badUUID400, badJWT401. Detail trả snapshot/Payment nếu có; status chỉ trả trạng thái/tổng hiện tại; GET không đổi state | FR-16 |

BR là mã quy tắc giải thích Activity, không thay mã AC/FR của SRS.

## 4. Bất biến và tính nhất quán

1. Chưa trả tiền cũng được xem đơn của mình; không yêu cầu PAID cho API history/detail.
2. Giỏ không giữ nguyên liệu; createOrder mới giữ kho. FAILURE thanh toán không tự hoàn kho.
3. Replay không tạo đơn, thanh toán hoặc trừ nguyên liệu lần hai. Key Order và Payment khác trách nhiệm.
4. Chỉ xác nhận trả tiền bằng dữ liệu backend, không bằng query-string, giá client hoặc text UI.
5. Không có đường lỗi đi xuyên tiếp xuống trả thành công; các nhánh khác nhau chỉ nối ở merge rõ ràng.
6. Final kết thúc lần hoạt động, không có nghĩa tự chuyển đơn thành COMPLETED/CANCELLED.
7. Đơn có bảy trạng thái theo SRS; Activity chỉ thể hiện những chuyển trạng thái thuộc luồng MVP hiện xét. Không tự thêm giao diện nhân viên/hủy đơn chỉ vì domain có enum.
8. Promotion/Loyalty vẫn là yêu cầu mô hình domain của Task2.3; không tự khẳng định có voucher/tích điểm trong FR/runtime đang xét.
