# Auth — TV5 Sprint 2, push đợt 1

Nền tích hợp: `1dd020d` của `feature/tv2-cart`, gồm TV3 `f80022c`, TV4 `17b8c18` và kho nguyên liệu `f2e8b5b`. Auth đã mount trong AppModule và dùng bảng User thật qua PrismaAuthUsers. Đây không còn là module chỉ chạy bằng fixture.

## HTTP contract cho TV6

| Route | Request và response |
| --- | --- |
| POST `/api/auth/register` | `{email,password,name?}` → 201 `{user:{id,email,name?}}`. Không tự đăng nhập; form TV6 đã hỗ trợ chuyển về login. |
| POST `/api/auth/login` | `{email,password}` → 200 `{accessToken,tokenType:"Bearer",expiresIn:3600,user:{id,email,name?}}`. |
| GET `/api/auth/me` | Authorization: Bearer token → 200 `{user:{id,email,name?}}`. |

Email được trim/lowercase, giới hạn 254 ký tự và kiểm tra dạng email cơ bản; không tuyên bố regex bao phủ toàn bộ RFC. Password không trim. Đăng ký yêu cầu 12–128 ký tự; đăng nhập 1–128 để không loại mật khẩu cũ chỉ do thay chính sách. Tên tùy chọn trim, tối đa 120 ký tự. Chặn field dư, kể cả role/passwordHash/userId. UserRole lấy mặc định CUSTOMER trong schema TV2, không từ client.

- 400: body/field không hợp lệ.
- 409: email đã tồn tại, bao gồm đăng ký đồng thời; unique constraint của PostgreSQL quyết định, không find-then-create để giả bảo đảm uniqueness.
- 401: sai email/password, thiếu/sai/hết hạn JWT hoặc tài khoản đã xóa. Sai email/password dùng cùng thông báo.
- Lỗi DB khác không bị biến thành lỗi trùng email hay kết quả đăng nhập thành công.

Hash dùng Node scrypt bất đồng bộ với salt riêng ngẫu nhiên 16 byte, N=32768/r=8/p=3, key 64 byte; so sánh timingSafeEqual. JWT dùng module chính thức @nestjs/jwt 12.0.4, HS256, sub là UUID tài khoản, exp/iat/iss/aud được kiểm tra, TTL 3600 giây. JWT không mã hóa payload, không chứa password/hash/email. Secret lấy từ JWT_SECRET tối thiểu 32 byte, không có khóa mặc định. Không đưa secret/token vào URL hoặc log.

Public response chỉ có projection id/email/name; adapter chọn riêng các field cần kiểm tra hash và không trả raw User ra HTTP.

## Nối với Orders của TV4

POST `/api/orders` đã gắn JwtAuthGuard. Guard xác minh chữ ký/token rồi đọc User thật, gắn request.user.id. OrdersController tiếp tục lấy chủ đơn từ principal này, không từ body.

- Chưa đăng nhập: 401 trước khi xử lý tạo đơn.
- Có token hợp lệ nhưng gửi total/price/userId trong body: 400 theo validator TV4.
- Có token và body hợp lệ: hiện trả **503 ORDER_STOCK_NOT_READY** vì chưa có callback kho thật của TV4 đợt 2. Không tự giả thành 201, không lưu đơn hoặc trừ kho trong trường hợp này.
- Khi TV4 đăng ký callback thật ở đợt 2, guard vẫn giữ nguyên; OrdersService điều phối transaction như contract TV2–TV4.

## Cấu hình và phạm vi

JWT_SECRET phải được đặt trước khi khởi động Nest; .env ở root được main.ts đọc trước khi tạo AppModule. Giữ nguyên secret khi restart nếu muốn JWT cũ còn hiệu lực. Đổi secret khiến token cũ không còn hợp lệ; không tự thay secret hợp lệ mỗi lần chạy.

UI TV6 hiện nhận name và accessToken/tokenType/user đúng contract. UI đang kiểm tra tối thiểu 6 ký tự còn backend yêu cầu 12; dùng mật khẩu từ 12 ký tự khi demo. TV6 cần đồng bộ validation/hint thành 12–128 trong đợt hoàn thiện UI; backend vẫn trả lỗi rõ nếu form gửi password quá ngắn. TV5 không viết lại UI TV6 trong gói backend này.

API History và kiểm tra owner đọc đơn thuộc đợt 2, không nằm trong gói này. Chưa có refresh token, server-side logout/revocation, email verification hoặc password reset. Rate limiting và chính sách token client cần nhóm chốt trước public production; không dùng test local làm chứng cứ đã nghiệm thu bảo mật production.

## Kiểm thử

- auth-http.spec.ts: HTTP fixture tests với JWT/hash thật; không thay cho chứng cứ DB.
- password-hasher.spec.ts: KDF/hash và cấu hình key.
- test/auth-postgres.e2e-spec.ts: HTTP + AppModule + Prisma + PostgreSQL thật, không mock JwtAuthGuard hoặc repository. Bắt buộc BREWLITE_AUTH_TEST_DATABASE_URL trỏ tới DB riêng có `_test` trong tên; thiếu ENV thì fail, không return/skip để tạo PASS giả.
- OrdersController và Orders PostgreSQL tests cũ override guard có chủ đích để giữ phạm vi test routing/service; suite Auth PostgreSQL mới xác minh guard thật trên chính POST /orders.

Chỉ tạo dữ liệu mang mã UUID riêng của lượt chạy, dọn đúng user/product đó. Không seed/reset/xóa toàn bộ DB, không lấy món/nguyên liệu đầu tiên rồi sửa dữ liệu của người khác.
