# Review nhất quán — SRS Huy, mô hình Trần Ân và Activity Lâm

Baseline code: Assignment2/main `f119683`. Đầu vào: `srs-tv4.docx.docx` của Huy, `Sơ đồ.docx` của Trần Ân, đề Assignment 2 v1.0. Đây là review tài liệu/mã nguồn; chưa tự sửa SRS, Use Case, Sequence hoặc mã runtime của thành viên khác.

## 1. Các điểm cần sửa hoặc chốt

| Mã review nội bộ | Phát hiện có nguồn | Hướng thống nhất | Người/phần phối hợp |
|---|---|---|---|
| GAP-01 | Sequence ghi thiếu nguyên liệu trả 400. FR-10/AC-10.3 và InventoryService dùng 409 INSUFFICIENT_INGREDIENT; thiếu công thức là 503 | Sửa nhãn và alt; lỗi phải rollback và không rơi tiếp xuống nhánh 201/thanh toán | Trần Ân, Huy, TV4 |
| GAP-02 | Sequence ghi FAILURE trả 400; PaymentsController dùng HttpCode 200, service trả success:false/outcome:FAILURE và PAYMENT_FAILED | Phân biệt HTTP xử lý thành công với nghiệp vụ thanh toán thất bại; 400 dành input sai. SUCCESS không được đặt vô điều kiện sau nhánh FAILURE | Trần Ân, Tuấn Em |
| GAP-03 | Sequence ghi GET /orders/me trả `{items:[...]}`; OrderHistoryController trả mảng cùng header X-Next-Cursor. SQL mô tả SELECT * không phản ánh projection/tie-breaker | Trả `[...]`; sắp xếp createdAt DESC, id DESC; owner filter trước pagination; không trả dữ liệu user/hash/key nội bộ | Trần Ân, TV5/TV6 |
| GAP-04 | use-checkout-orchestrator.ts: handleCheckStatus khi PAYMENT_FAILED hoặc PENDING đều set phase failed; không đổi paymentKey ở đường đối chiếu này. Trong handlePay, chỉ nhánh nhận success:false trực tiếp mới đổi paymentKey | FR-14 yêu cầu không gửi lần mới khi chưa rõ và key mới sau FAILURE rõ ràng. Case FAILURE đã commit nhưng mất phản hồi → GET thấy PAYMENT_FAILED → đổi outcome/key cần được xử lý đúng; nếu giữ key cũ với outcome mới sẽ 409. ACT-04 v1.1 chỉ cho nhánh FAILURE khi backend xác nhận đúng lần thử đang chờ; PENDING/trạng thái cũ/thiếu bằng chứng đều giữ unknown. Đây là thiết kế theo FR-14, **không chứng nhận code đã đáp ứng** | Tuấn Em/TV6 và Huy chốt/sửa code hoặc điều chỉnh AC có lý do |
| GAP-05 | Sequence login ghi mật khẩu >=12 và DB verify hash. Register mới yêu cầu 12–128; LoginDto cho 1–128, không trim password; scrypt chạy ở API | Chuyển verify sang API; min12 chỉ thể hiện ở đăng ký. Không đổi password hay policy chỉ để sơ đồ dễ vẽ | Trần Ân, TV5 |
| GAP-06 | Sequence Payment request thiếu outcome, trong khi MockPayment DTO yêu cầu outcome (SUCCESS/FAILURE); response thành công dùng transactionId/success/amount chứ không phải paymentId như mô tả | Đồng bộ request/response thực; không đưa client outcome vào thiết kế thanh toán thật. Payment là module nội bộ mock, không có ngân hàng ngoài | Trần Ân, Tuấn Em |
| GAP-07 | Use Case tổng quát có Staff cập nhật trạng thái / quản lý nguyên liệu. Code hiện có domain state machine, reserveStock/releaseStock nhưng không có API/UI vận hành nhân viên/quản trị | Ghi rõ thiết kế mở rộng, hoặc bổ sung FR/API/UI/AC trước khi coi là MVP đã có. Không dùng ACT-05 xem status để thay cho luồng nhân viên cập nhật | Huy, Ân Trương, Trần Ân, Khoa |
| GAP-08 | Xem chi tiết «include» Tùy chỉnh bắt buộc khách tùy chỉnh mọi lần xem; Tùy chỉnh «extend» Manage Cart chưa có extension point/điều kiện rõ. Mock Gateway đặt ngoài boundary có thể bị hiểu là dịch vụ ngoài runtime | Chốt mức mô hình mục tiêu hay hiện thực. Thể hiện chọn cấu hình trước thao tác thêm giỏ; giải thích biến thể tùy chọn; gọi Mock Payment là nội bộ nếu mô tả hiện thực | Trần Ân và người viết UC |
| GAP-09 | Sequence thể hiện 201 sau alt thiếu tồn, và SUCCESS xuất hiện sau alt FAILURE; activation/deactivation ở alt có nguy cơ không cân bằng | Nhánh lỗi cần break/return hoặc phân nhánh bao kín, không trả success vô điều kiện; retry là request mới có đầy đủ vòng phản hồi; kiểm tra activation từng nhánh | Trần Ân |
| GAP-10 | FR của Huy đã có mã, nhưng chưa nhận NFR và đặc tả cuối hai UC Đặt đơn/Thanh toán | Giữ FR-01–18; không tự đặt NFR/UC ID. Mapping dùng alias UC trong đầu vào và tên luồng; chờ nhóm gắn mã chính thức | Ân Trương, Tuấn Em, người tổng hợp SRS |
| GAP-11 | Đề Task 2.3 bắt buộc Promotion, LoyaltyTransaction; schema runtime đang đối chiếu chưa có hai lớp này | Khoa đã cung cấp Class với Promotion và LoyaltyTransaction; hai lớp được giữ ở mức mở rộng domain, cần bổ sung FR/AC trước khi triển khai, không tự thêm voucher/tích điểm vào Activity MVP | Khoa và người tổng hợp phạm vi |

## 2. Kiểm tra các luồng đã đưa vào Activity

- Hết hàng tại client: ước tính hợp lệ bằng 0 hoặc số lượng vượt ước tính thì chặn thêm. Ước tính lỗi/không có không tự suy thành tồn vô hạn đã được cam kết; backend vẫn recheck khi đặt.
- Tạo đơn: JWT/body/key → replay hoặc transaction mới → snapshot/giữ nguyên liệu → commit hoặc rollback; replay không trừ kho thêm. Header key API là tùy chọn, frontend có gửi.
- Chưa đăng nhập: ACT-00 gọi ACT-02, đồng thời API vẫn kiểm tra JWT ở ACT-03/04/05, không tin việc UI báo đã login.
- Payment: xác định FAILURE khác kết quả chưa rõ; khóa Order khác khóa Payment. Không tự hoàn tồn khi failure; chỉ có hàm hoàn kho chưa đồng nghĩa có UI/API hủy đơn.
- Success thật mới xóa giỏ. Lịch sử luôn dùng owner + snapshot; không tính lại giá catalog và không cho tài khoản khác đọc đơn.
- Dữ liệu lỗi/empty/loading khác nhau; 401/404/5xx không được biến thành mẫu PAID hoặc empty thật.
- Khách có thể xem lịch sử độc lập, kể cả đơn chưa trả tiền; ACT-05 không bắt buộc phải đi qua nhánh PAID của ACT-00.
- 7 trạng thái là enum/domain; ACT không tuyên bố đã có actor/API staff để chuyển qua toàn bộ trạng thái.

## 3. Các quyết định còn cần nhóm xác nhận

1. Huy xác nhận bộ FR/AC và phạm vi các chức năng Should; Ân Trương cung cấp NFR để hoàn tất Task 1.2.
2. Người phụ trách thanh toán/checkout quyết định sửa GAP-04 và chạy case mất response sau FAILURE, status PENDING khi chưa có kết luận, rồi retry không trùng.
3. Trần Ân sửa nhãn/luồng Sequence và ranh giới Use Case theo bảng, phối hợp hai người đặc tả UC Task 1.3.
4. Khoa xác nhận phạm vi domain mở rộng và review Task 1.1 chung. Trường hợp chọn khác MVP, cập nhật SRS/UC trước và ghi change log.

Các mục trên là yêu cầu đồng bộ kỹ thuật, không phải tuyên bố nhóm đã duyệt hoặc các tests đã chạy đạt. Không đặt trạng thái nghiệm thu “100% khớp” cho tới khi các điểm này được giải quyết.

## 4. Kết luận riêng cho phần Task 1.1/2.1 của TV5

Phiên bản 1.1 đã sửa trực tiếp phần của TV5: nhất quán loại mô hình thiết kế theo yêu cầu; nhánh tìm/lọc rỗng và xóa lọc; commit trước xác nhận thành công; luồng thanh toán chưa rõ không tự giải phóng khóa; pagination có vòng lặp; status/detail tách riêng; mapping đến từng AC. Không tự sửa nguồn Use Case/Sequence của Trần Ân hoặc SRS của Huy.

GAP-04 cần lưu ý thêm: status API hiện tại chỉ trả trạng thái đơn và cờ có Payment, không trả payment-attempt key. Khi đã từng có một FAILURE rồi gửi lần mới, đọc lại PAYMENT_FAILED có thể là trạng thái cũ, không chứng minh lần mới đã thất bại. Vì vậy điều kiện “FAILURE đúng lần thử” của ACT-04 chưa thể được đảm bảo chỉ bằng dữ liệu status hiện có. Cách hiện thực phải do người phụ trách checkout/payment bổ sung và kiểm thử, không tự bịa thêm một API đã tồn tại.

Thiếu NFR không có nghĩa Task 1.1/2.1 không thể hoàn thành: các mục bắt buộc của hai task đã có trong gói. Tuy nhiên không được đánh dấu Task 1.2 hoặc toàn bộ chuỗi truy vết nhóm là đã hoàn thành khi chưa có đầu vào tương ứng.
