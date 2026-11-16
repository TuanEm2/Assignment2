# Đặc tả yêu cầu phần mềm BrewLite

## 1. Phạm vi

BrewLite hỗ trợ xem menu, chọn tùy chọn, quản lý giỏ, đăng nhập, đặt đơn, thanh toán mô phỏng và theo dõi đơn. SRS mô tả cách hệ thống quản lý trạng thái đơn và các yêu cầu vận hành.

## 2. Quy ước

- **FR** là yêu cầu chức năng, **NFR** là yêu cầu phi chức năng và **AC** là mã tiêu chí chấp nhận.
- **MoSCoW** gồm Must (bắt buộc), Should (nên có), Could (có thể có) và Won’t (ngoài phạm vi bản phát hành này).
- Các đường dẫn kiểm thử trong mục 5 tính từ thư mục gốc của repository BrewLite.

## 3. Yêu cầu chức năng

### 3.1. Nhóm 1 · Menu

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-01 | **Xem menu đồ uống** | Khách mở `/menu` để xem tên, giá gốc theo VND và ảnh của các đồ uống từ `GET /api/products` trong chế độ API. | Must | - **AC-01.1** `GET /api/products` trả HTTP 200 cùng mảng sản phẩm. Menu hiển thị đúng tên, giá và ảnh hoặc ảnh minh họa nếu ảnh lỗi.<br>- **AC-01.2** Trong khi tải, giao diện hiển thị trạng thái đang tải.<br>- **AC-01.3** Danh sách rỗng có thông báo menu đang cập nhật.<br>- **AC-01.4** Tải thất bại có thông báo lỗi và nút thử lại.<br>- **AC-01.5** Trong chế độ API, lỗi API không tự động làm hệ thống chuyển sang dữ liệu demo. |
| FR-02 | **Tìm kiếm đồ uống** | Khách tìm theo tên hoặc mô tả đồ uống trên menu. | Should | - **AC-02.1** Tìm theo tên hoặc mô tả, không phân biệt chữ hoa, chữ thường và dấu tiếng Việt.<br>- **AC-02.2** Không có kết quả thì hiển thị thông báo và cho phép xóa bộ lọc.<br>- **AC-02.3** Khi xóa từ khóa và đặt lại bộ lọc trên giao diện, danh sách trở lại đầy đủ. |

### 3.2. Nhóm 2 · Chi tiết sản phẩm

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-03 | **Xem chi tiết và lựa chọn đồ uống** | Trang `/products/:id` lấy chi tiết từ `GET /api/products/:id` và cho khách chọn size, topping, số lượng trước khi thêm vào giỏ. | Must | - **AC-03.1** API trả HTTP 200 và thông tin sản phẩm gồm tên, ảnh, giá gốc và các lựa chọn size, topping đối với ID tồn tại.<br>- **AC-03.2** Đổi size, topping hoặc số lượng thì cập nhật tạm tính.<br>- **AC-03.3** Số lượng là số nguyên từ 1 đến 99.<br>- **AC-03.4** Không cho thêm vào giỏ khi số lượng không hợp lệ hoặc chưa chọn size bắt buộc.<br>- **AC-03.5** ID sai định dạng trả HTTP 400. UUID hợp lệ nhưng không tồn tại trả HTTP 404. Khi tải chi tiết thất bại, giao diện hiển thị lỗi và cho phép thử lại. |
| FR-17 | **Hiển thị số ly ước tính** | Hệ thống ước tính số ly có thể pha từ tồn kho và công thức theo size và topping. Trang chi tiết gọi `GET /api/products/:id/availability`. | Should | - **AC-17.1** Với từng nguyên liệu, cộng tổng nhu cầu cho một ly rồi lấy phần nguyên của tồn chia cho nhu cầu. Số ly ước tính là giá trị nhỏ nhất trong các kết quả.<br>- **AC-17.2** Menu hiển thị ước tính cho size S không topping khi API trả `availableCups` hợp lệ và liên kết chi tiết được bật.<br>- **AC-17.3** Trang chi tiết cập nhật số ly ước tính theo size và topping đã chọn khi có dữ liệu.<br>- **AC-17.4** Có ước tính hợp lệ thì chặn thêm số lượng vượt ước tính.<br>- **AC-17.5** Khi không lấy được số ly ước tính, giao diện hiển thị thông báo và backend kiểm tra lại tồn khi tạo đơn.<br>- **AC-17.6** Xem ước tính không thay đổi tồn kho. |

### 3.3. Nhóm 3 · Giỏ hàng

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-04 | **Thêm và lưu giỏ hàng** | Khách thêm lựa chọn vào giỏ và giữ dữ liệu trên cùng trình duyệt sau khi tải lại trang. | Must | - **AC-04.1** Dòng giỏ lưu sản phẩm, size, topping và số lượng.<br>- **AC-04.2** Thêm lại cùng sản phẩm, size và tập topping thì cộng vào dòng hiện có, tối đa 99.<br>- **AC-04.3** Thứ tự chọn topping không tạo dòng khác.<br>- **AC-04.4** Size hoặc tập topping khác tạo dòng riêng.<br>- **AC-04.5** Tải lại trang trên cùng trình duyệt thì giỏ được khôi phục từ dữ liệu đã lưu. |
| FR-05 | **Cập nhật giỏ hàng và xem tạm tính** | Khách tăng, giảm số lượng, xóa món và xem tổng tạm tính. | Must | - **AC-05.1** Đổi số lượng hợp lệ thì cập nhật thành tiền dòng và tổng giỏ.<br>- **AC-05.2** Xóa dòng thì dòng biến mất và tổng được tính lại.<br>- **AC-05.3** Giỏ rỗng có thông báo và không thể gửi thanh toán.<br>- **AC-05.4** Giá một ly bằng giá gốc cộng phụ thu size và topping. Thành tiền dòng bằng giá một ly nhân số lượng. |

### 3.4. Nhóm 4 · Xác thực

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-06 | **Đăng ký tài khoản** | Khách đăng ký qua `POST /api/auth/register` bằng email, mật khẩu và tên tùy chọn. | Must | - **AC-06.1** Dữ liệu hợp lệ và email chưa sử dụng tạo được tài khoản, trả HTTP 201.<br>- **AC-06.2** Mật khẩu dài từ 12 đến 128 ký tự.<br>- **AC-06.3** Email trùng trả HTTP 409.<br>- **AC-06.4** Dữ liệu sai hoặc có trường không được phép trả HTTP 400.<br>- **AC-06.5** Phản hồi không chứa mật khẩu hoặc passwordHash.<br>- **AC-06.6** Giao diện kiểm tra mật khẩu xác nhận khớp trước khi gửi đăng ký. |
| FR-07 | **Đăng nhập và sử dụng phiên xác thực** | Khách đăng nhập qua `POST /api/auth/login` và dùng JWT Bearer để gọi API được bảo vệ. | Must | - **AC-07.1** Đăng nhập hợp lệ trả HTTP 200, accessToken và thông tin người dùng.<br>- **AC-07.2** Sai email hoặc mật khẩu trả HTTP 401.<br>- **AC-07.3** API được bảo vệ từ chối token thiếu, sai hoặc hết hạn.<br>- **AC-07.4** Frontend lưu thông tin phiên sau đăng nhập thành công.<br>- **AC-07.5** Khi đăng nhập từ checkout, giao diện điều hướng trở lại checkout theo luồng hiện có. |

### 3.5. Nhóm 5 · Đặt đơn

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-08 | **Tạo đơn hàng** | Khách đã xác thực gửi các lựa chọn trong giỏ tới `POST /api/orders`. | Must | - **AC-08.1** Yêu cầu tạo mới hợp lệ, đủ nguyên liệu trả HTTP 201, mã đơn, tổng tiền backend và trạng thái `PENDING`.<br>- **AC-08.2** Chủ đơn lấy từ người dùng đã xác thực.<br>- **AC-08.3** Body chỉ có `items`. Mỗi dòng gồm `productId`, `sizeId` (UUID hoặc `null`), `toppingIds` (mảng có thể rỗng) và `quantity`.<br>- **AC-08.4** Từ chối trường ngoài hợp đồng như giá, tổng tiền, trạng thái hoặc userId.<br>- **AC-08.5** Giỏ rỗng, UUID sai, topping trùng hoặc số lượng ngoài 1–99 trả HTTP 400.<br>- **AC-08.6** Không có phiên hợp lệ trả HTTP 401.<br>- **AC-08.7** Sản phẩm không tồn tại trả HTTP 404. |
| FR-09 | **Tính giá và lưu thông tin tại thời điểm đặt** | Backend tính giá từ catalog và lưu thông tin món khi tạo đơn. | Must | - **AC-09.1** Đơn giá bằng giá sản phẩm cộng phụ thu size và topping.<br>- **AC-09.2** Thành tiền dòng bằng đơn giá nhân số lượng. Tổng đơn bằng tổng thành tiền của các dòng.<br>- **AC-09.3** Size và topping được chọn phải thuộc đúng sản phẩm. Lựa chọn sai trả HTTP 400.<br>- **AC-09.4** Lưu tên sản phẩm, tên size, thông tin topping, số lượng, đơn giá và thành tiền.<br>- **AC-09.5** Lịch sử sử dụng thông tin đã lưu, không tính lại theo giá catalog hiện tại. |
| FR-12 | **Chống tạo đơn trùng** | Checkout gửi header `Idempotency-Key` khi gọi API tạo đơn. API áp dụng cơ chế gửi lại theo từng tài khoản khi có khóa. | Must | - **AC-12.1** Cùng người dùng, khóa và nội dung thì trả lại đơn đã lưu.<br>- **AC-12.2** Cùng người dùng và khóa nhưng khác nội dung trả HTTP 409.<br>- **AC-12.3** Nhiều yêu cầu đồng thời cùng khóa và nội dung chỉ tạo một đơn, trừ nguyên liệu một lần.<br>- **AC-12.4** Header khóa nếu có phải dài 1–128 ký tự ASCII in được và không chứa khoảng trắng. Sai định dạng trả HTTP 400. |

### 3.6. Nhóm 6 · Quản lý nguyên liệu

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-10 | **Giữ nguyên liệu cùng giao dịch tạo đơn** | Tính nhu cầu theo size, topping và số lượng, rồi cập nhật nguyên liệu trong cùng giao dịch tạo đơn. | Must | - **AC-10.1** Cộng dồn nguyên liệu dùng chung giữa các dòng trước khi kiểm tra tồn.<br>- **AC-10.2** Đủ nguyên liệu thì trừ đúng lượng và lưu lượng đã trừ vào `OrderIngredient`.<br>- **AC-10.3** Thiếu nguyên liệu trả HTTP 409, mã `INSUFFICIENT_INGREDIENT`.<br>- **AC-10.4** Thiếu công thức size hoặc topping cần thiết trả HTTP 503, mã `INGREDIENT_RECIPE_NOT_CONFIGURED`.<br>- **AC-10.5** Một bước trong giao dịch thất bại thì hoàn tác các thay đổi về đơn, dòng món, tồn kho và bản ghi `OrderIngredient`. |
| FR-11 | **Không bán vượt tồn khi đặt đồng thời** | Kiểm soát nhiều đơn cùng sử dụng nguyên liệu để lượng giữ không vượt tồn thực tế. | Must | - **AC-11.1** Với dữ liệu kiểm thử chỉ đủ cho 3 đơn và 10 yêu cầu đồng thời, mỗi yêu cầu mua một phần tương đương, chỉ 3 đơn thành công.<br>- **AC-11.2** Bảy yêu cầu còn lại bị từ chối với lỗi xung đột HTTP 409.<br>- **AC-11.3** Tồn không âm và lượng đã trừ khớp với các đơn thành công. |

### 3.7. Nhóm 7 · Thanh toán

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-13 | **Thanh toán mô phỏng** | Khách gọi `POST /api/payments/mock` để thanh toán đơn của mình bằng ví hoặc thẻ mô phỏng. | Must | - **AC-13.1** API mock chỉ hoạt động khi `PAYMENT_MODE=mock`. Nếu chế độ mock bị tắt, API trả HTTP 403.<br>- **AC-13.2** Phương thức gồm `MOCK_WALLET` và `MOCK_CARD`. Kết quả mô phỏng là `SUCCESS` hoặc `FAILURE`.<br>- **AC-13.3** Số tiền lấy từ tổng đã lưu của đơn. API lấy chủ đơn từ JWT và từ chối yêu cầu trên đơn của tài khoản khác.<br>- **AC-13.4** Thanh toán thành công ghi Payment, PaymentAttempt và chuyển đơn sang PAID trong cùng giao dịch.<br>- **AC-13.5** Thanh toán thất bại ghi PaymentAttempt và chuyển hoặc giữ đơn ở PAYMENT_FAILED trong cùng giao dịch.<br>- **AC-13.6** Cùng đơn, cùng `idempotencyKey` và cùng nội dung trả về kết quả lần thử đã ghi nhận. Dùng lại khóa với phương thức hoặc kết quả mô phỏng khác trả HTTP 409.<br>- **AC-13.7** Đơn đã thanh toán không được tạo khoản thanh toán thứ hai. |
| FR-14 | **Thử lại và kiểm tra kết quả thanh toán** | Checkout giữ dữ liệu cần thiết trong cùng phiên để thử lại sau khi thất bại hoặc kiểm tra kết quả qua `GET /api/payments/mock/status/:orderId` khi kết quả chưa rõ. | Must | - **AC-14.1** Thất bại thì giữ giỏ.<br>- **AC-14.2** Trong cùng phiên Checkout, nếu giỏ không đổi và yêu cầu thanh toán trực tiếp trả kết quả `FAILURE`, lần thử tiếp theo giữ khóa tạo đơn và dùng khóa thanh toán mới.<br>- **AC-14.3** Kết quả chưa rõ thì hiển thị trạng thái cần kiểm tra và chặn gửi thanh toán tiếp trong trạng thái đó.<br>- **AC-14.4** Nút Kiểm tra trạng thái gọi API theo mã đơn. Nếu chưa đọc được kết quả thì giữ trạng thái chưa rõ.<br>- **AC-14.5** Chỉ xóa giỏ khi backend xác nhận thành công. Màn hình thành công dùng tổng tiền backend trả về. |

### 3.8. Nhóm 8 · Lịch sử và quản lý trạng thái đơn

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| FR-15 | **Xem lịch sử đơn cá nhân** | Khách đã đăng nhập xem danh sách đơn thuộc tài khoản mình. | Must | - **AC-15.1** Hiển thị mã đơn, thời gian, tổng tiền và trạng thái.<br>- **AC-15.2** Chủ đơn lấy từ JWT, không nhận userId do khách tự chọn.<br>- **AC-15.3** Sắp xếp từ mới đến cũ.<br>- **AC-15.4** Chưa có đơn thì thông báo phù hợp.<br>- **AC-15.5** API trả HTTP 401 thì giao diện lịch sử hướng dẫn đăng nhập lại. |
| FR-16 | **Xem chi tiết và trạng thái đơn** | Khách xem chi tiết đơn và trạng thái đã lưu sau khi tạo đơn (FR-08) hoặc xử lý thanh toán (FR-13). | Must | - **AC-16.1** Hiển thị món, size, topping, số lượng, thành tiền, tổng đơn và trạng thái theo dữ liệu đã lưu. Khách chỉ đọc được trạng thái của đơn thuộc tài khoản mình.<br>- **AC-16.2** Có thanh toán thành công thì hiển thị thông tin thanh toán được API cung cấp.<br>- **AC-16.3** Đơn không tồn tại hoặc thuộc người khác trả HTTP 404.<br>- **AC-16.4** UUID sai trả HTTP 400.<br>- **AC-16.5** Không có token hợp lệ trả HTTP 401. |
| FR-18 | **Xem thêm lịch sử đơn** | Khách tải thêm các đơn cũ bằng `cursor` từ `GET /api/orders/me`. | Should | - **AC-18.1** API mặc định lấy tối đa 20 đơn một lần.<br>- **AC-18.2** limit hợp lệ trong khoảng 1–50.<br>- **AC-18.3** Header `X-Next-Cursor` có giá trị khi còn đơn cũ hơn. Giao diện dùng giá trị này để tải trang tiếp theo.<br>- **AC-18.4** Cursor sai định dạng, không tồn tại hoặc thuộc tài khoản khác trả HTTP 400. |

## 4. Yêu cầu phi chức năng

### 4.1. Nhóm 1 · Bảo mật

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| NFR-01 | **Bảo vệ phiên và dữ liệu tài khoản** | Phiên đăng nhập và dữ liệu đơn chỉ được dùng trong phạm vi tài khoản đã xác thực. | Must | - Phản hồi đăng ký, đăng nhập và đọc đơn không chứa mật khẩu hoặc `passwordHash`.<br>- API đặt đơn và lịch sử trả HTTP 401 nếu token thiếu, giả mạo hoặc hết hạn.<br>- Khi đọc chi tiết hoặc trạng thái, đơn thuộc người khác và đơn không tồn tại đều trả HTTP 404. |
| NFR-07 | **Bảo mật cấu hình triển khai** | Dùng secret qua cấu hình môi trường và giới hạn các kết nối tới production. | Must | - Secret không xuất hiện trong mã nguồn hoặc log CI.<br>- API production chỉ cho phép CORS với origin đã cấu hình.<br>- Web và API dùng HTTPS, PostgreSQL dùng kết nối nội bộ và không mở truy cập trực tiếp từ Internet. |

### 4.2. Nhóm 2 · Nhất quán và phục hồi

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| NFR-02 | **Nhất quán dữ liệu và an toàn khi gửi đồng thời** | Đơn, kho và thanh toán phải nhất quán khi có lỗi hoặc nhiều yêu cầu đồng thời. | Must | - Tạo đơn, lưu các dòng món, trừ tồn nguyên liệu và lưu `OrderIngredient` cùng commit hoặc cùng rollback.<br>- Khi kho đủ ba phần, 10 yêu cầu đặt đồng thời chỉ tạo ba đơn thành công. Tồn kho không âm.<br>- Mười yêu cầu của cùng người dùng với cùng khóa và nội dung chỉ tạo một đơn và trừ tồn một lần.<br>- Mỗi đơn có tối đa một `Payment` thành công. |
| NFR-03 | **Phục hồi khi kết quả thanh toán chưa rõ** | Checkout bảo vệ dữ liệu giỏ và tránh thanh toán trùng khi mất phản hồi. | Must | - Trong phiên Checkout hiện tại, giữ giỏ và khóa thanh toán trong khi kết quả chưa rõ. Cho phép kiểm tra trạng thái từ backend.<br>- Chỉ xóa giỏ khi backend xác nhận thành công.<br>- Gửi lại đúng yêu cầu với cùng khóa không tạo khoản thanh toán thứ hai. |

### 4.3. Nhóm 3 · Hiệu năng và trải nghiệm trên điện thoại

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| NFR-04 | **Hiệu năng API cho luồng khách hàng** | Đo thời gian phản hồi của API menu và tạo đơn trên staging. | Should | - Mục tiêu đề xuất là p95 ≤ 1 giây cho `GET /api/products` và p95 ≤ 2 giây cho `POST /api/orders`.<br>- Đo với dữ liệu seed, 10 người dùng đồng thời và 100 request thành công mỗi kịch bản sau khi làm nóng. Dùng khóa riêng cho mỗi lần tạo đơn và chuẩn bị đủ nguyên liệu.<br>- Ghi cấu hình môi trường, p95, số request thành công và số request lỗi. |
| NFR-05 | **Khả năng sử dụng trên điện thoại** | Menu, chi tiết sản phẩm, giỏ hàng và Checkout dùng được trên màn hình điện thoại. | Must | - Ở viewport 320 px và 390 px, các màn hình trong luồng không tràn ngang và thao tác được mà không cần phóng to.<br>- Có phản hồi khi tải, rỗng hoặc lỗi tùy màn hình. Trong lúc thanh toán đang xử lý, nút xác nhận bị khóa. |

### 4.4. Nhóm 4 · Triển khai và vận hành

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
| --- | --- | --- | --- | --- |
| NFR-06 | **Triển khai tái lập** | Tái tạo môi trường ứng dụng từ hướng dẫn, cấu hình và dữ liệu mẫu trong repo. | Must | - Dựng được Web, API và PostgreSQL bằng hướng dẫn trong repo.<br>- Migration chạy trên PostgreSQL trống. Chạy seed lần thứ hai không nhân bản dữ liệu mẫu.<br>- Nếu kiểm tra chất lượng thất bại thì pipeline chặn triển khai. |
| NFR-08 | **Khả năng quan sát và chẩn đoán** | Có thể theo dõi tiến trình API và xác định lỗi theo phiên bản triển khai. | Should | - `GET /api/health` trả HTTP 200 cùng trạng thái tiến trình khi API hoạt động.<br>- Live smoke gọi thêm `GET /api/products` để kiểm tra đường đọc cơ sở dữ liệu.<br>- Log CI/CD ghi mã phiên bản, kết quả kiểm tra và bước lỗi mà không ghi token hoặc secret. |
| NFR-09 | **Tính khả dụng và khôi phục dịch vụ** | Website và API production truy cập được, có kiểm tra sau triển khai và quy trình quay lại phiên bản đã kiểm chứng. | Must | - URL Web và API production truy cập được qua HTTPS. Live smoke sau deploy gọi được Web, health và catalog thật.<br>- Khi API mất phản hồi, giao diện thông báo lỗi hoặc kết quả chưa rõ và chỉ báo thanh toán thành công khi backend xác nhận.<br>- Rollback đưa Web và API về phiên bản đã kiểm chứng. Ghi SHA và chạy lại live smoke. |

## 5. Kiểm chứng

### Yêu cầu chức năng

| Mã | Kiểm chứng |
| --- | --- |
| FR-01 | Kiểm tra hợp đồng catalog và trạng thái tải, rỗng, lỗi, thử lại của Menu. `apps/api/test/products.e2e-spec.ts`, `apps/web/src/app/menu/menu.test.tsx`. |
| FR-02 | Kiểm tra tìm không dấu, thông báo khi không có kết quả và khôi phục danh sách khi xóa bộ lọc. `apps/web/src/app/menu/menu.test.tsx`. |
| FR-03 | Kiểm tra HTTP 200/400/404, tùy chọn và tạm tính. `apps/api/test/products.e2e-spec.ts`, `apps/web/src/app/products/[id]/product-detail.test.tsx`. |
| FR-04 | Kiểm tra gộp hoặc tách dòng, giới hạn 99. `apps/web/src/app/cart/cart-view.test.tsx`, `tests/cart-calculations.test.mjs`. Tải lại trang trên cùng trình duyệt để xác minh giỏ được khôi phục. |
| FR-05 | Kiểm tra tăng giảm số lượng, xóa món, giỏ rỗng và tính tiền. `apps/web/src/app/cart/cart-view.test.tsx`, `tests/cart-calculations.test.mjs`. |
| FR-06 | Kiểm tra đăng ký đúng/sai, email trùng và dữ liệu trả về. `apps/api/test/auth-postgres.e2e-spec.ts`, `apps/web/src/app/register/register.test.tsx`. |
| FR-07 | Kiểm tra đăng nhập, JWT thiếu/sai/hết hạn và trở lại Checkout. `apps/api/test/auth-postgres.e2e-spec.ts`, `apps/web/src/app/login/login.test.tsx`. |
| FR-08 | Kiểm tra body, quyền truy cập, trạng thái trả về và lưu đơn. `apps/api/src/orders/orders.controller.spec.ts`, `apps/api/test/orders-postgres.e2e-spec.ts`, `apps/api/test/auth-postgres.e2e-spec.ts`. |
| FR-09 | Kiểm tra giá và thông tin món lúc đặt, rồi đổi catalog và đọc lại đơn cũ. `apps/api/test/orders-postgres.e2e-spec.ts`, `apps/api/test/history-postgres.e2e-spec.ts`. |
| FR-10 | Kiểm thử giao dịch giữ nguyên liệu, lỗi thiếu tồn hoặc công thức và hoàn tác dữ liệu. `apps/api/test/inventory-postgres.e2e-spec.ts`. |
| FR-11 | Gửi yêu cầu đồng thời trên PostgreSQL và kiểm tra số đơn thành công cùng tồn kho cuối. `apps/api/test/inventory-postgres.e2e-spec.ts`. |
| FR-12 | Kiểm tra gửi lại, đổi nội dung và 10 yêu cầu trùng khóa. `apps/api/src/orders/orders.controller.spec.ts`, `apps/api/test/orders-postgres.e2e-spec.ts`, `apps/api/test/inventory-postgres.e2e-spec.ts`. |
| FR-13 | Kiểm tra thành công, thất bại, lấy tiền từ đơn, quyền sở hữu và chống trả tiền hai lần. `apps/api/src/payments/payments.service.spec.ts`, `apps/api/test/orders-postgres.e2e-spec.ts`, `apps/api/test/history-postgres.e2e-spec.ts`. |
| FR-14 | Kiểm tra thử lại sau thất bại, lỗi mất phản hồi, kiểm tra trạng thái và xóa giỏ khi thành công. `apps/web/src/lib/checkout/checkout-orchestrator.test.ts`, `apps/web/src/app/checkout/checkout-view.test.tsx`. |
| FR-15 | Kiểm tra danh sách theo JWT, thứ tự, lịch sử trống và phản hồi HTTP 401. `apps/api/test/history-postgres.e2e-spec.ts`, `apps/web/src/app/orders/orders-view.test.tsx`. |
| FR-16 | Kiểm tra đọc chi tiết/trạng thái theo chủ đơn và dữ liệu đã lưu. `apps/api/test/history-postgres.e2e-spec.ts`, `apps/web/src/app/orders/[id]/order-detail-content.test.tsx`. |
| FR-17 | Kiểm tra phép tính từ công thức nguyên liệu và thay đổi size hoặc topping. `apps/api/src/products/availability.spec.ts` và `apps/web/src/app/products/[id]/product-detail.test.tsx`. |
| FR-18 | Kiểm tra `limit`, `cursor`, `X-Next-Cursor`, phân trang không trùng và thao tác tải đơn cũ. `apps/api/test/history-postgres.e2e-spec.ts`, `apps/web/src/app/orders/orders-view.test.tsx`. |

### Yêu cầu phi chức năng

| Mã | Kiểm chứng |
| --- | --- |
| NFR-01 | Chạy bộ Auth và History với PostgreSQL thử nghiệm. Liên kết FR-06, FR-07, FR-08, FR-15, FR-16. |
| NFR-02 | Chạy bộ Orders và Inventory PostgreSQL. Liên kết FR-08 đến FR-13. |
| NFR-03 | Kiểm tra Checkout với mất phản hồi và đối chiếu PaymentAttempt/Payment trên PostgreSQL. Liên kết FR-12 đến FR-14. |
| NFR-04 | Đo p95 và tỷ lệ lỗi trên staging cho API trong FR-01 và FR-08 đến FR-10. |
| NFR-05 | Dùng component test cho Menu, chi tiết, giỏ và Checkout. Kiểm tra bố cục ở 320 px và 390 px bằng trình duyệt. Liên quan FR-01, FR-03 đến FR-05 và FR-14. |
| NFR-06 | Đối chiếu `compose.yaml`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml` và `README.md`. Chạy migration trên DB trống và seed lặp để xác nhận khả năng tái lập. |
| NFR-07 | Đối chiếu cấu hình CORS, HTTPS và kết nối DB trong môi trường production. Kiểm tra secret trong repo và log triển khai. |
| NFR-08 | Đối chiếu `apps/api/test/app.e2e-spec.ts`, `tests/smoke/production-smoke.mjs` và log của bản phát hành. |
| NFR-09 | Đối chiếu `tests/smoke/production-smoke.mjs` và `.github/workflows/cd.yml`. Lưu kết quả live smoke, kiểm tra UI khi API mất phản hồi và kết quả rollback theo SHA. Liên quan NFR-06, NFR-08, FR-01, FR-13 và FR-14. |
