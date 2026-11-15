# BrewLite — Bối cảnh, stakeholder và phạm vi (Task 1.1)

| Thuộc tính | Nội dung |
|---|---|
| Dự án | BrewLite — Assignment 2, Requirements to Deployment v1.0 |
| Phân công Task 1.1 | Triệu Phú Lâm và Đặng Đăng Khoa |
| Người chuẩn bị bản này | Triệu Phú Lâm chuẩn bị toàn bộ Task 1.1; giữ ghi nhận phân công chung với Khoa |
| Căn cứ yêu cầu | Đề Assignment2-BrewLite v1.0, mục 1.1, 3.1–3.3, 4.1 và 8.1 |
| Căn cứ nghiệp vụ | Bản FR-01–FR-18 do Huy (TV4) tổng hợp trong srs-tv4.docx.docx; Use Case/Sequence do Trần Ân gửi trong Sơ đồ.docx |
| Nền mã nguồn đối chiếu | Repo TuanEm2/Assignment2, main tại f119683; không dùng nhánh Assignment 1 |
| Trạng thái | Phiên bản 1.1 đã kiểm tra các mục bắt buộc Task 1.1; phạm vi thiết kế theo FR của Huy; trạng thái triển khai được đối chiếu riêng |

## 1. Bối cảnh và vấn đề nghiệp vụ

BrewLite là ứng dụng web đặt đồ uống cho mô hình cửa hàng/quầy phục vụ. Luồng tối thiểu theo đề là **xem menu → chọn tùy chọn → giỏ hàng → đặt đơn → thanh toán → theo dõi đơn**. Dự án tiếp nối đề tài Assignment 1 nhưng hiện thực và tài liệu bàn giao được quản lý trong repository Assignment2.

Những vấn đề nghiệp vụ cần giải quyết trong mô hình học tập này:

- Khách cần xem đồ uống, hiểu giá và phụ thu size/topping trước khi xác nhận. Lựa chọn và số lượng phải được giữ đúng qua giỏ hàng.
- Giá trên trình duyệt có thể bị thay đổi và dữ liệu catalog có thể đổi giữa lúc chọn món và đặt đơn; backend phải tự định giá, lưu snapshot để lịch sử còn đối chiếu được.
- Nhiều khách có thể cùng sử dụng một nguyên liệu; số ly ước tính ở menu không phải cam kết giữ hàng. Tạo đơn phải kiểm tra và giữ nguyên liệu nguyên tử để không bán vượt tồn hoặc lưu đơn dở dang.
- Mạng lỗi, bấm lại hoặc thử thanh toán lại có thể gây đơn/thanh toán trùng. Cần phân biệt thất bại đã xác định với kết quả chưa rõ và dùng đúng khóa idempotency.
- Khách cần biết đơn của mình đang ở trạng thái nào; xác thực và ownership phải ngăn việc đọc đơn tài khoản khác.
- Nhóm cần bộ tạo phẩm nhất quán từ yêu cầu đến mô hình, mã nguồn, kiểm thử và triển khai; việc có code hoặc có pipeline không tự chứng minh production đang chạy.

Đây là **phân tích bối cảnh đề xuất**, không phải kết quả phỏng vấn hay số liệu khảo sát cửa hàng thực tế. Chưa có bằng chứng về thời gian chờ, doanh số hoặc tỷ lệ lỗi ngoài thực tế; không dùng các con số giả định làm kết quả đo.

## 2. Mục tiêu của sản phẩm

1. Cho khách hoàn tất một lần mua đồ uống hợp lệ với đúng cấu hình, tổng tiền backend và mã đơn có thể đọc lại.
2. Lưu đơn, dòng món, tồn nguyên liệu và thanh toán một cách nhất quán khi có lỗi hoặc yêu cầu gửi lặp.
3. Bảo vệ tài khoản và dữ liệu đơn của từng khách.
4. Cung cấp một MVP có thể chạy, kiểm thử, đóng gói và triển khai bằng Next.js, NestJS, PostgreSQL và Docker theo đề.
5. Cung cấp tài liệu có nguồn, mã tham chiếu và lịch sử thay đổi để giảng viên kiểm tra và thành viên khác tiếp tục phát triển.

Các tiêu chí định lượng về hiệu năng, availability và khả năng sử dụng thuộc Task 1.2. Task 1.1 ghi nhận nhu cầu/ràng buộc và không tự đặt ngưỡng NFR thay người phụ trách; điều này không ngăn việc hoàn thành bối cảnh và phạm vi hiện tại.

## 3. Bảng stakeholder

Stakeholder là người/đơn vị có lợi ích hoặc ảnh hưởng tới sản phẩm; không đồng nghĩa mọi stakeholder đều là actor trực tiếp trong Use Case của MVP.

| Mã nội bộ | Stakeholder | Mục tiêu và kỳ vọng | Vai trò trong MVP / cách kiểm chứng |
|---|---|---|---|
| SH-01 | Khách hàng, gồm khách chưa có tài khoản | Xem menu rõ ràng; chọn đúng size/topping/số lượng; không bị tính sai hoặc tạo trùng; xem được đơn của mình; hiểu lỗi và khả năng thử lại | Guest xem menu/giỏ, khách xác thực đặt và xem đơn. Đối chiếu FR-01–FR-18 và AC tương ứng |
| SH-02 | Nhân viên quầy | Nhận thông tin món/số lượng rõ; hiểu trạng thái phục vụ; tránh nhận đơn khi thiếu nguyên liệu | Có nhu cầu nghiệp vụ. Domain có PREPARING/READY/COMPLETED; hiện chưa có UI/API nhân viên cập nhật trạng thái. Không coi đây là chức năng vận hành đã bàn giao |
| SH-03 | Quản lý cửa hàng | Kiểm soát bán vượt tồn, dữ liệu đơn nhất quán, có thể đối chiếu thanh toán và tổ chức công thức/tồn | Kho nguyên liệu và snapshot nằm trong MVP backend. Dashboard quản trị/nhập kho/báo cáo chưa nằm trong FR được gửi; không suy từ enum ADMIN ra quyền quản trị đã có |
| SH-04 | Giảng viên / khách hàng nghiệm thu | Hệ thống đúng đề, tài liệu nhất quán, truy vết được; demo có thể kiểm chứng; hiểu phạm vi và hạn chế | Review yêu cầu, sơ đồ, code, test, CI/CD, URL và minh chứng theo checklist đề |
| SH-05 | Nhóm phát triển và người bảo trì | Hợp đồng API thống nhất, phân công rõ, không ghi đè phần nhau; có migration, test và hướng dẫn tái tạo | Git/PR, docs, các bộ test và hướng dẫn local/deploy/rollback. Tài liệu phải ghi baseline và phần còn cần duyệt |
| SH-06 | Đơn vị thanh toán (vai trò nghiệp vụ) | Xử lý/đối chiếu giao dịch đúng số tiền, chống trùng, bảo vệ dữ liệu | MVP chỉ dùng Mock Wallet/Card nội bộ NestJS, không kết nối đơn vị ngoài hoặc thu tiền thật. Vai trò nhà cung cấp ngoài là điểm tích hợp tương lai, không phải hệ thống ngoài đã triển khai |

## 4. Ranh giới hệ thống

- Trong phạm vi BrewLite: UI Next.js, trạng thái giỏ/phiên trên client, API NestJS (Auth, Products, Orders, Inventory, Payments, Order History), dữ liệu PostgreSQL và các migration.
- Mock Payment là module nội bộ của backend, không phải cổng ngân hàng ngoài đang thu tiền. Có thể mô hình hóa riêng để tách trách nhiệm nhưng phải ghi rõ ranh giới nội bộ.
- Thiết bị/trình duyệt là môi trường khách sử dụng; nhà cung cấp registry/hosting và CI hỗ trợ vận hành, không phải actor mua hàng.
- JWT xác định user; chủ đơn không lấy từ trường userId do client tự chọn. Giá và tồn ở client chỉ để tham khảo; API và database là nguồn quyết định khi tạo đơn.
- Kết thúc luồng mua tối thiểu là khách được xác nhận và có thể theo dõi đơn; không mặc định có giao vận, hóa đơn thuế hoặc thanh toán ngân hàng thật.

## 5. In-scope — phạm vi MVP

| Nhóm | Nội dung trong phạm vi | FR liên quan | Ranh giới / lưu ý |
|---|---|---|---|
| Menu và lựa chọn | API catalog/detail; loading/empty/error; tìm không dấu; size/topping/số lượng 1–99; tạm giá | FR-01–FR-03 | Category chỉ có thể dùng khi nguồn dữ liệu có trường tương ứng; chưa coi phân loại thực tế đã đạt |
| Giỏ | Thêm, gộp cấu hình giống nhau, đổi số lượng, xóa, lưu trên cùng trình duyệt, tính tạm tổng | FR-04–FR-05 | Không cam kết đồng bộ đa thiết bị hoặc giữ tồn khi thêm giỏ |
| Tài khoản | Register/Login, hash scrypt, JWT Bearer và kiểm tra phiên khi gọi API bảo vệ | FR-06–FR-07 | Mật khẩu đăng ký 12–128; không gửi hash ra client; đăng nhập không áp lại điều kiện min 12 như điều kiện nghiệp vụ mới |
| Đơn và giá | Tạo PENDING từ ID lựa chọn; định giá backend; snapshot món, size/topping, số lượng và giá | FR-08–FR-09 | Từ chối body tự gán giá, userId, status; đọc lại không tính theo catalog mới |
| Nguyên liệu | Công thức size/topping, cộng nhu cầu dùng chung, khóa/cập nhật có điều kiện trong transaction, snapshot OrderIngredient và rollback | FR-10–FR-11 | Ước tính không giữ kho; backend kiểm tra lại; không đồng nghĩa có màn hình nhập kho |
| Chống đơn trùng | Idempotency theo user/key/payload; replay không trừ kho thêm | FR-12 | Header hiện tùy chọn tại API; checkout có gửi; không hứa giữ khóa sau reload |
| Thanh toán | Ví/Thẻ mô phỏng, PaymentAttempt, Payment duy nhất, kiểm tra số tiền từ đơn, retry và trạng thái chưa rõ | FR-13–FR-14 | Chỉ bật trong PAYMENT_MODE=mock; không thu tiền thật; không tự hoàn nguyên liệu khi thất bại |
| Theo dõi | Danh sách đơn cá nhân, detail/status có ownership, snapshot/Payment, cursor | FR-15–FR-16, FR-18 | GET không chuyển status; 404 cho đơn không có/không thuộc người dùng |
| Số ly ước tính | Đọc tồn/công thức cho cấu hình hiện tại, hiển thị ước tính và chặn số lượng khi đã biết vượt | FR-17 | Should. Tồn có thể đổi sau khi đọc; khi không đọc được, UI thông báo và backend vẫn kiểm tra lúc đặt |
| Chất lượng và delivery | Unit, integration/E2E phù hợp, migration, CI, Docker, CD, health và bàn giao theo Task 4–5 | Đề Task 4–5; chờ NFR | Cần bằng chứng chạy thực tế; không dùng sự hiện diện file để kết luận nghiệm thu |

Mức MoSCoW và AC của từng FR giữ theo bản Huy: FR-02, FR-17, FR-18 là Should; các FR còn lại trong danh sách là Must. Phạm vi mục tiêu và trạng thái hiện thực là hai cột khác nhau; xem bảng khoảng cách trong tài liệu kiểm tra luồng.

## 6. Phạm vi mở rộng (chưa cam kết giao trong MVP)

| Nội dung | Giá trị kỳ vọng | Điều kiện trước khi đưa vào phạm vi |
|---|---|---|
| Dashboard nhân viên, cập nhật pha chế/sẵn sàng/hoàn tất | Hỗ trợ vận hành quầy thực tế | Chốt actor, quyền, API/UI và AC; hiện domain state machine chưa thay thế UI/API vận hành |
| Quản trị sản phẩm, công thức, nhập/điều chỉnh nguyên liệu | Quản lý tồn chủ động | Thêm FR, audit và quyền; seed/migration không phải UI quản trị |
| Promotion, LoyaltyTransaction | Khuyến mãi/tích điểm | Task 2.3 bắt buộc mô hình hóa các lớp này; chưa có FR hoặc schema/runtime trong nền đối chiếu. Task 2.3 của Khoa nằm trong thư mục riêng của nhóm; không ghi đã áp voucher/tích điểm |
| Cổng thanh toán thật | Thu tiền/đối soát ngoài hệ thống | Hợp đồng nhà cung cấp, xác thực giao dịch, xử lý refund và bảo mật; không dùng outcome do client gửi cho thanh toán thật |
| PWA đầy đủ, offline, thông báo đẩy | Hỗ trợ thiết bị di động | Chốt NFR và phạm vi offline; không coi mobile-first đồng nghĩa đã có offline checkout |
| Phân loại dữ liệu, đồng bộ giỏ/phiên qua thiết bị | Tìm món và dùng nhiều thiết bị thuận tiện | Schema/API và AC cụ thể, chính sách dữ liệu |

## 7. Out-of-scope — không thực hiện trong MVP đang xét

- Thu tiền ngân hàng/thẻ/ví thật, lưu thông tin thẻ, PayPal hoặc chuyển khoản ngân hàng thực.
- Giao vận, phí vận chuyển, theo dõi shipper, marketplace nhiều cửa hàng, thương mại xuyên biên giới.
- Hoàn tiền tự động, giải quyết tranh chấp hoặc chính sách hủy/giữ kho theo thời hạn chưa được nhóm đặc tả.
- Endpoint/UI hủy đơn hoặc tự động hoàn kho: Inventory có hàm releaseStock nhưng chưa có luồng hủy công khai được chốt; không vẽ khách bấm Hủy như chức năng đang chạy.
- Xác minh email, quên mật khẩu, OTP/MFA, social login, quản trị vai trò hoặc thu hồi JWT phía server khi logout.
- Cam kết category/filter thực tế nếu API chưa cấp category; cam kết checkout tiếp tục giữ key/đơn sau reload.
- Dashboard doanh thu, hóa đơn điện tử hoặc chính sách tích điểm/khuyến mãi chưa được thêm vào FR. Yêu cầu vẽ lớp domain mở rộng ở Task 2.3 vẫn phải thực hiện riêng theo đề.

## 8. Giả định

| Mã nội bộ | Giả định | Hệ quả / cách xác nhận |
|---|---|---|
| ASM-01 | Một catalog/cửa hàng với giá VND nguyên, không có thuế/phí/vận chuyển ngoài giá hiện tại | Chốt với nhóm khi SRS thay đổi; không cộng các khoản không có trong contract |
| ASM-02 | Công thức và tồn được chuẩn bị bằng seed/migration hoặc dữ liệu hợp lệ của nhóm | Thiếu công thức phải báo lỗi; không coi là tồn vô hạn |
| ASM-03 | Khách có mạng khi xác thực, đặt/thanh toán và đọc lịch sử | Chưa hỗ trợ nghiệp vụ thanh toán offline; lỗi mạng cần thông báo và đối chiếu |
| ASM-04 | Chế độ thanh toán phục vụ học tập, không thu tiền thật | Đơn vị thanh toán ngoài chưa tham gia runtime; minh chứng ghi rõ mock |
| ASM-05 | Trình duyệt hỗ trợ lưu giỏ và phiên theo cơ chế frontend hiện có | Lưu tại browser không bảo đảm đa thiết bị hoặc khi người dùng xóa dữ liệu |
| ASM-06 | Bản Huy là danh sách FR làm việc hiện hành, chưa được coi là bản nghiệm thu của cả nhóm | Giữ mã FR và ghi phiên bản; chờ người phụ trách duyệt thay đổi, bổ sung NFR/use case |

## 9. Ràng buộc

| Mã nội bộ | Ràng buộc | Nguồn / ảnh hưởng |
|---|---|---|
| CON-01 | Next.js frontend, NestJS backend, PostgreSQL; không thay ba thành phần bắt buộc | Đề mục 1.1; frontend theo hướng mobile-first/PWA |
| CON-02 | Tạo phẩm Task 1 → 2 → 3 → 4 → 5 theo thứ tự nghiệm thu; có lịch sử Git rõ ràng | Đề mục 1 và 8; tài liệu bổ sung ghi đúng thời điểm, không suy từ code rằng tài liệu trước đã được duyệt |
| CON-03 | docs/requirements/context-and-scope.md phải có stakeholder, in/out scope, giả định và ràng buộc | Task 1.1; tài liệu này là tạo phẩm bắt buộc |
| CON-04 | Activity/Sequence/Class phải khớp SRS/use case/model, có nguồn và bản kết xuất phù hợp | Task 2; mã FR của Huy dùng cho đối chiếu, chưa đặt mã NFR thay người phụ trách |
| CON-05 | Client không quyết định chủ đơn, giá hoặc trạng thái thanh toán cuối | FR-07–FR-14; JWT + validate + transaction / idempotency |
| CON-06 | Secrets không vào Git/log, DB production không public trực tiếp; HTTPS khi production | Task 5.4; cần kiểm chứng vận hành, không chỉ vẽ kiến trúc |
| CON-07 | Truy vết yêu cầu → use case/story → sơ đồ → code/API → test | Đề mục 8.1; mapping Activity là phần đóng góp, không tự thay matrix chung |
| CON-08 | Deadline và nguồn lực nhóm học tập; chức năng mở rộng phải có thay đổi phạm vi được duyệt | Ràng buộc dự án đề xuất; không tự thêm chức năng để làm sơ đồ trông đầy đủ |

## 10. Rủi ro ban đầu

| Mã nội bộ | Rủi ro / tác động | Biện pháp và bên phối hợp |
|---|---|---|
| RSK-01 | FR, use case, Activity và Sequence mô tả khác nhau; mất khả năng truy vết | Cố định baseline; ghi mapping FR/AC; review cùng Huy, Ân Trương, Trần Ân và Tuấn Em |
| RSK-02 | Trình bày mock như thanh toán thật hoặc gán thêm shipping/PWA offline | Ghi ranh giới và out-of-scope; chỉ dùng chức năng có nguồn |
| RSK-03 | Số ly ước tính lỗi thời gây thất bại khi tạo đơn | Thông báo ước tính; kiểm tra/khóa nguyên liệu khi commit đơn; giữ giỏ khi lỗi |
| RSK-04 | Lỗi mạng/retry gây đơn hoặc payment trùng / trạng thái chưa rõ | Idempotency; tách key Order/Payment; đối chiếu status; không tự gửi lần thanh toán mới khi chưa rõ |
| RSK-05 | Lộ dữ liệu qua token/chủ đơn, lỗi quyền hoặc state UI tài khoản cũ | JWT, owner filter tại DB, không trả hash; test hai tài khoản, xóa state khi đổi phiên |
| RSK-06 | Có domain state machine nhưng không có actor/API/UI vận hành | Phân biệt domain model với feature vận hành; không vẽ cập nhật trạng thái nhân viên là MVP đã chạy |
| RSK-07 | Tiêu chí Should/NFR/domain mở rộng chưa được chốt | Ghi điểm cần quyết định, không tự gán PASS hoặc đổi mã |
| RSK-08 | Pipeline/config có nhưng không có production/URL/migration an toàn | Yêu cầu minh chứng theo Task 5; chỉ người phụ trách release xác nhận triển khai |
| RSK-09 | Đổi source tài liệu trên các nhánh gây overwrite hoặc tham chiếu ảnh cũ | Chỉ thay file Activity của Lâm, thêm scope/review; không sửa Sequence/SRS của thành viên khác; dùng PR và baseline check |

## 11. Liên kết và bàn giao

- Task 1.2: bản FR Huy; phần NFR do Ân Trương theo phân công, chưa nhận trong gói đầu vào này.
- Task 1.3: đặc tả Đặt đơn và Thanh toán do Ân Trương/Tuấn Em theo phân công. Bản Checkout hiện có trong repo là đầu vào đối chiếu, không thay việc họ chốt bản cuối.
- Task 2.1: `../../diagrams/task2.1/activity-order.drawio` (6 trang ACT-00–ACT-05), các ảnh SVG và `../../diagrams/task2.1/activity-order.md`.
- Review chéo: `../../diagrams/task2.1/activity-consistency-review.md` và `../../diagrams/task2.1/activity-traceability.md`.
- Người làm matrix chung cần nối mã UC/story chính thức với các ACT/FR đã liệt kê. SH/ASM/CON/RSK/ACT là mã nội bộ của tạo phẩm, không phải mã FR/NFR/UC được tự thêm vào SRS.

Bản này không tuyên bố đã phỏng vấn stakeholder, đã có NFR được duyệt, đã chạy lại toàn bộ tests hoặc đã nghiệm thu production.

## 12. Quy tắc nhất quán với thiết kế

Bộ Activity v1.1 là thiết kế hành vi theo FR/AC, không phải mô tả rằng mọi nhánh đã được mã nguồn hiện thực đúng. Các quy tắc dùng chung nằm ở `../../diagrams/task2.1/activity-flow-contract.md`. Mâu thuẫn ở tài liệu khác hoặc khoảng cách code được ghi tại `../../diagrams/task2.1/activity-consistency-review.md`; không đưa hành vi sai vào phạm vi chỉ để khớp code. Checklist đường đi nằm ở `../../diagrams/task2.1/kiem-tra-luong-e2e.md`.
