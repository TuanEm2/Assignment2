# Đối chiếu từng AC của Huy với Activity — v1.1

Mã và nội dung AC dưới đây được giữ theo bản `srs-tv4.docx.docx`, không cấp mã mới. Cột thể hiện chỉ xác nhận yêu cầu đã được đặt vào mô hình/quy tắc hành động; **không phải kết quả PASS kiểm thử runtime**. Một Activity có thể gom các kiểm tra chi tiết trong một action; hợp đồng BR giải thích đầy đủ, không cần biến mọi phép validate thành một diamond.

| AC | Nội dung tiêu chí của Huy | Trang/node và quy tắc | Mức thể hiện |
|---|---|---|---|
| AC-01.1 | Khi API trả dữ liệu hợp lệ, menu hiển thị đúng tên và giá sản phẩm; có ảnh hoặc hình thay thế khi ảnh lỗi. | ACT-01: load/res/menu/empty/err; BR-01 | Nhánh/hoạt động + quy tắc action |
| AC-01.2 | Trong khi tải, giao diện hiển thị trạng thái đang tải. | ACT-01: load/res/menu/empty/err; BR-01 | Nhánh/hoạt động + quy tắc action |
| AC-01.3 | Danh sách rỗng có thông báo menu đang cập nhật. | ACT-01: load/res/menu/empty/err; BR-01 | Nhánh/hoạt động + quy tắc action |
| AC-01.4 | Tải thất bại có thông báo lỗi và nút thử lại. | ACT-01: load/res/menu/empty/err; BR-01 | Nhánh/hoạt động + quy tắc action |
| AC-01.5 | Trong chế độ API, lỗi API không tự động làm hệ thống chuyển sang dữ liệu demo. | ACT-01: load/res/menu/empty/err; BR-01 | Nhánh/hoạt động + quy tắc action |
| AC-02.1 | Tìm kiếm không phân biệt chữ hoa, chữ thường và dấu tiếng Việt. | ACT-01: menu/filter/noresults/clearfilter; BR-02 | Nhánh/hoạt động + quy tắc action |
| AC-02.2 | Không có kết quả thì hiển thị thông báo và cho phép xóa bộ lọc. | ACT-01: menu/filter/noresults/clearfilter; BR-02 | Nhánh/hoạt động + quy tắc action |
| AC-02.3 | Xóa từ khóa và bộ lọc thì danh sách trở lại trạng thái đầy đủ. | ACT-01: menu/filter/noresults/clearfilter; BR-02 | Nhánh/hoạt động + quy tắc action |
| AC-03.1 | Hiển thị đúng sản phẩm, giá gốc và tùy chọn từ API. | ACT-01: detail/exists/options/estimate/valid; BR-03 | Nhánh/hoạt động + quy tắc action |
| AC-03.2 | Đổi size, topping hoặc số lượng thì cập nhật tạm tính. | ACT-01: detail/exists/options/estimate/valid; BR-03 | Nhánh/hoạt động + quy tắc action |
| AC-03.3 | Số lượng là số nguyên từ 1 đến 99. | ACT-01: detail/exists/options/estimate/valid; BR-03 | Nhánh/hoạt động + quy tắc action |
| AC-03.4 | Không cho thêm vào giỏ khi số lượng không hợp lệ hoặc chưa chọn size bắt buộc. | ACT-01: detail/exists/options/estimate/valid; BR-03 | Nhánh/hoạt động + quy tắc action |
| AC-03.5 | Sản phẩm không tồn tại hoặc tải thất bại có thông báo phù hợp. | ACT-01: detail/exists/options/estimate/valid; BR-03 | Nhánh/hoạt động + quy tắc action |
| AC-04.1 | Dòng giỏ lưu sản phẩm, size, topping và số lượng. | ACT-01: cart; BR-04 | Action tổng hợp + bất biến chi tiết BR |
| AC-04.2 | Thêm lại cùng sản phẩm, size và tập topping thì cộng vào dòng hiện có, tối đa 99. | ACT-01: cart; BR-04 | Action tổng hợp + bất biến chi tiết BR |
| AC-04.3 | Thứ tự chọn topping không tạo dòng khác. | ACT-01: cart; BR-04 | Action tổng hợp + bất biến chi tiết BR |
| AC-04.4 | Size hoặc tập topping khác tạo dòng riêng. | ACT-01: cart; BR-04 | Action tổng hợp + bất biến chi tiết BR |
| AC-04.5 | Tải lại trang trên cùng trình duyệt thì giỏ được khôi phục từ dữ liệu đã lưu. | ACT-01: cart; BR-04 | Action tổng hợp + bất biến chi tiết BR |
| AC-05.1 | Đổi số lượng hợp lệ thì cập nhật thành tiền dòng và tổng giỏ. | ACT-01: edit/calc/nonempty/cartempty; BR-03/04 | Nhánh/hoạt động + quy tắc action |
| AC-05.2 | Xóa dòng thì dòng biến mất và tổng được tính lại. | ACT-01: edit/calc/nonempty/cartempty; BR-03/04 | Nhánh/hoạt động + quy tắc action |
| AC-05.3 | Giỏ rỗng có thông báo và không thể gửi thanh toán. | ACT-01: edit/calc/nonempty/cartempty; BR-03/04 | Nhánh/hoạt động + quy tắc action |
| AC-05.4 | Giá một ly bằng giá gốc cộng phụ thu size và topping; thành tiền dòng bằng giá một ly nhân số lượng. | ACT-01: edit/calc/nonempty/cartempty; BR-03/04 | Nhánh/hoạt động + quy tắc action |
| AC-06.1 | Dữ liệu hợp lệ và email chưa sử dụng tạo được tài khoản, trả HTTP 201. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-06.2 | Mật khẩu dài từ 12 đến 128 ký tự. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-06.3 | Email trùng trả HTTP 409. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-06.4 | Dữ liệu sai hoặc có trường không được phép trả HTTP 400. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-06.5 | Phản hồi không chứa mật khẩu hoặc passwordHash. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-06.6 | Giao diện kiểm tra mật khẩu xác nhận khớp trước khi gửi đăng ký. | ACT-02: reg/rvalid/rready/regapi/regres/regerr/regok; BR-06 | Nhánh/hoạt động + quy tắc action |
| AC-07.1 | Đăng nhập hợp lệ trả HTTP 200, accessToken và thông tin người dùng. | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/store/protected/tok; BR-07 | Nhánh/hoạt động + quy tắc action |
| AC-07.2 | Sai email hoặc mật khẩu trả HTTP 401. | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/store/protected/tok; BR-07 | Nhánh/hoạt động + quy tắc action |
| AC-07.3 | API được bảo vệ từ chối token thiếu, sai hoặc hết hạn. | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/store/protected/tok; BR-07 | Nhánh/hoạt động + quy tắc action |
| AC-07.4 | Frontend lưu thông tin phiên sau đăng nhập thành công. | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/store/protected/tok; BR-07 | Nhánh/hoạt động + quy tắc action |
| AC-07.5 | Khi đăng nhập từ checkout, giao diện điều hướng trở lại checkout theo luồng hiện có. | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/store/protected/tok; BR-07 | Nhánh/hoạt động + quy tắc action |
| AC-08.1 | Yêu cầu hợp lệ và đủ nguyên liệu trả HTTP 201, mã đơn, tổng tiền và trạng thái PENDING. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.2 | Chủ đơn lấy từ người dùng đã xác thực. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.3 | Body chỉ gồm items; mỗi dòng gồm productId, sizeId, toppingIds, quantity. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.4 | Từ chối trường ngoài hợp đồng như giá, tổng tiền, trạng thái hoặc userId. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.5 | Giỏ rỗng, UUID sai, topping trùng hoặc số lượng ngoài 1–99 trả HTTP 400. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.6 | Không có phiên hợp lệ trả HTTP 401. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-08.7 | Sản phẩm không tồn tại trả HTTP 404. | ACT-03: send/guard/valid/new/reserve/result; BR-08 | Nhánh/hoạt động + quy tắc action |
| AC-09.1 | Đơn giá bằng giá sản phẩm cộng phụ thu size và topping. | ACT-03: new/reserve; ACT-05: snapshot; BR-08/09 | Action tổng hợp + bất biến chi tiết BR |
| AC-09.2 | Thành tiền dòng bằng đơn giá nhân số lượng; tổng đơn bằng tổng các dòng. | ACT-03: new/reserve; ACT-05: snapshot; BR-08/09 | Action tổng hợp + bất biến chi tiết BR |
| AC-09.3 | Size và topping phải thuộc đúng sản phẩm. | ACT-03: new/reserve; ACT-05: snapshot; BR-08/09 | Action tổng hợp + bất biến chi tiết BR |
| AC-09.4 | Lưu tên sản phẩm, tên size, thông tin topping, số lượng, đơn giá và thành tiền. | ACT-03: new/reserve; ACT-05: snapshot; BR-08/09 | Action tổng hợp + bất biến chi tiết BR |
| AC-09.5 | Lịch sử sử dụng thông tin đã lưu, không tính lại theo giá catalog hiện tại. | ACT-03: new/reserve; ACT-05: snapshot; BR-08/09 | Action tổng hợp + bất biến chi tiết BR |
| AC-10.1 | Cộng dồn nguyên liệu dùng chung giữa các dòng trước khi kiểm tra tồn. | ACT-03: reserve/commit/stock/rollback; BR-10 | Nhánh/hoạt động + quy tắc action |
| AC-10.2 | Đủ nguyên liệu thì trừ đúng lượng và lưu snapshot vào OrderIngredient. | ACT-03: reserve/commit/stock/rollback; BR-10 | Nhánh/hoạt động + quy tắc action |
| AC-10.3 | Thiếu nguyên liệu trả HTTP 409, mã INSUFFICIENT_INGREDIENT. | ACT-03: reserve/commit/stock/rollback; BR-10 | Nhánh/hoạt động + quy tắc action |
| AC-10.4 | Thiếu công thức size hoặc topping cần thiết trả HTTP 503, mã INGREDIENT_RECIPE_NOT_CONFIGURED. | ACT-03: reserve/commit/stock/rollback; BR-10 | Nhánh/hoạt động + quy tắc action |
| AC-10.5 | Một bước trong transaction thất bại thì hoàn tác các thay đổi về đơn, dòng món, tồn kho và snapshot của yêu cầu. | ACT-03: reserve/commit/stock/rollback; BR-10 | Nhánh/hoạt động + quy tắc action |
| AC-11.1 | Với dữ liệu kiểm thử chỉ đủ cho 3 đơn và 10 yêu cầu đồng thời, mỗi yêu cầu mua một phần tương đương, chỉ 3 đơn thành công. | ACT-03: reserve/commit/stock; BR-11 | Action tổng hợp + bất biến chi tiết BR |
| AC-11.2 | Các yêu cầu còn lại bị từ chối do xung đột hoặc thiếu nguyên liệu. | ACT-03: reserve/commit/stock; BR-11 | Action tổng hợp + bất biến chi tiết BR |
| AC-11.3 | Tồn không âm; lượng đã trừ khớp các đơn thành công. | ACT-03: reserve/commit/stock; BR-11 | Action tổng hợp + bất biến chi tiết BR |
| AC-12.1 | Cùng người dùng, khóa và nội dung thì trả lại đơn đã lưu. | ACT-03: key/replay/same/old/conflict/new; BR-12 | Action tổng hợp + bất biến chi tiết BR |
| AC-12.2 | Cùng người dùng và khóa nhưng khác nội dung trả HTTP 409. | ACT-03: key/replay/same/old/conflict/new; BR-12 | Action tổng hợp + bất biến chi tiết BR |
| AC-12.3 | Nhiều yêu cầu đồng thời cùng khóa và nội dung chỉ tạo một đơn, trừ nguyên liệu một lần. | ACT-03: key/replay/same/old/conflict/new; BR-12 | Action tổng hợp + bất biến chi tiết BR |
| AC-12.4 | Header khóa sai định dạng trả HTTP 400. | ACT-03: key/replay/same/old/conflict/new; BR-12 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.1 | Endpoint mô phỏng chỉ hoạt động khi PAYMENT_MODE=mock. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.2 | Phương thức gồm MOCK_WALLET, MOCK_CARD. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.3 | Số tiền lấy từ đơn; client không quyết định amount hoặc chủ đơn. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.4 | Thành công ghi Payment, PaymentAttempt và chuyển đơn sang PAID. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.5 | Thất bại ghi PaymentAttempt, chuyển hoặc giữ đơn ở PAYMENT_FAILED. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.6 | Gửi lại cùng khóa và nội dung trả kết quả đã ghi nhận, không tạo thanh toán trùng. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-13.7 | Đơn đã thanh toán không được tạo khoản thanh toán thứ hai. | ACT-04: choose/send/validate/accept/process/received/known; BR-13 | Action tổng hợp + bất biến chi tiết BR |
| AC-14.1 | Thất bại thì giữ giỏ. | ACT-04: fail/retry/newkey/unknown/check/read/status/confirmedfail/paidmerge/success; BR-14/15 | Thiết kế theo AC; khoảng cách code GAP-04 |
| AC-14.2 | Trong cùng phiên checkout, giỏ không đổi thì thử lại sau thất bại đã xác nhận giữ khóa tạo đơn và tạo khóa thanh toán mới. | ACT-04: fail/retry/newkey/unknown/check/read/status/confirmedfail/paidmerge/success; BR-14/15 | Thiết kế theo AC; khoảng cách code GAP-04 |
| AC-14.3 | Kết quả chưa rõ thì hiển thị trạng thái cần kiểm tra và chặn gửi thanh toán tiếp trong trạng thái đó. | ACT-04: fail/retry/newkey/unknown/check/read/status/confirmedfail/paidmerge/success; BR-14/15 | Thiết kế theo AC; khoảng cách code GAP-04 |
| AC-14.4 | Nút kiểm tra đọc kết quả từ backend. | ACT-04: fail/retry/newkey/unknown/check/read/status/confirmedfail/paidmerge/success; BR-14/15 | Thiết kế theo AC; khoảng cách code GAP-04 |
| AC-14.5 | Chỉ xóa giỏ khi backend xác nhận thanh toán thành công. | ACT-04: fail/retry/newkey/unknown/check/read/status/confirmedfail/paidmerge/success; BR-14/15 | Thiết kế theo AC; khoảng cách code GAP-04 |
| AC-15.1 | Hiển thị mã đơn, thời gian, tổng tiền và trạng thái. | ACT-05: fetch/read/ok/error/list; BR-16 | Nhánh/hoạt động + quy tắc action |
| AC-15.2 | Chủ đơn lấy từ JWT, không nhận userId do khách tự chọn. | ACT-05: fetch/read/ok/error/list; BR-16 | Nhánh/hoạt động + quy tắc action |
| AC-15.3 | Sắp xếp từ mới đến cũ. | ACT-05: fetch/read/ok/error/list; BR-16 | Nhánh/hoạt động + quy tắc action |
| AC-15.4 | Chưa có đơn thì thông báo phù hợp. | ACT-05: fetch/read/ok/error/list; BR-16 | Nhánh/hoạt động + quy tắc action |
| AC-15.5 | API trả HTTP 401 thì giao diện lịch sử hướng dẫn đăng nhập lại. | ACT-05: fetch/read/ok/error/list; BR-16 | Nhánh/hoạt động + quy tắc action |
| AC-16.1 | Hiển thị món, size, topping, số lượng, thành tiền, tổng đơn và trạng thái theo dữ liệu đã lưu. | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly; BR-09/17 | Nhánh/hoạt động + quy tắc action |
| AC-16.2 | Có thanh toán thành công thì hiển thị thông tin thanh toán được API cung cấp. | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly; BR-09/17 | Nhánh/hoạt động + quy tắc action |
| AC-16.3 | Đơn không tồn tại hoặc thuộc người khác trả HTTP 404. | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly; BR-09/17 | Nhánh/hoạt động + quy tắc action |
| AC-16.4 | UUID sai trả HTTP 400. | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly; BR-09/17 | Nhánh/hoạt động + quy tắc action |
| AC-16.5 | Không có token hợp lệ trả HTTP 401. | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly; BR-09/17 | Nhánh/hoạt động + quy tắc action |
| AC-17.1 | Số ly bằng giá trị nhỏ nhất của floor(tồn nguyên liệu / nhu cầu cho một ly). | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-17.2 | Menu có thể hiển thị ước tính size S không topping khi API trả availableCups và liên kết chi tiết được bật. | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-17.3 | Chi tiết cập nhật ước tính theo size và topping. | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-17.4 | Có ước tính hợp lệ thì chặn thêm số lượng vượt ước tính. | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-17.5 | Không kiểm tra được thì thông báo; backend vẫn kiểm tra khi tạo đơn. | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-17.6 | Xem ước tính không thay đổi tồn kho. | ACT-01: api/estimate/valid; ACT-03: reserve; BR-05 | Action tổng hợp + bất biến chi tiết BR |
| AC-18.1 | API mặc định lấy tối đa 20 đơn một lần. | ACT-05: fetchmerge/fetch/read/list/action/more; BR-16 | Action tổng hợp + bất biến chi tiết BR |
| AC-18.2 | limit hợp lệ trong khoảng 1–50. | ACT-05: fetchmerge/fetch/read/list/action/more; BR-16 | Action tổng hợp + bất biến chi tiết BR |
| AC-18.3 | Còn dữ liệu thì API cung cấp X-Next-Cursor. | ACT-05: fetchmerge/fetch/read/list/action/more; BR-16 | Action tổng hợp + bất biến chi tiết BR |
| AC-18.4 | Cursor không hợp lệ hoặc không thuộc phạm vi người dùng bị từ chối. | ACT-05: fetchmerge/fetch/read/list/action/more; BR-16 | Action tổng hợp + bất biến chi tiết BR |

Tổng cộng: **89 AC thuộc 18 FR**. Bao phủ yêu cầu trong thiết kế không đồng nghĩa cả 89 AC đã có test riêng hoặc hiện thực đạt. FR-11 cần test đồng thời DB; FR-14 cần chốt cơ chế xác nhận đúng lần thử khi phản hồi bị mất.
