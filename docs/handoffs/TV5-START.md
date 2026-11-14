# Cập nhật Sprint 2 đợt 2

History đã được nối PostgreSQL thật trên nền TV4 `afd9c92`. Đọc `TV5-sprint2-push2.md`, `TV5-TV6-history-integration.md` và `../api/order-history.md` trước. Các mục chờ History/Inventory bên dưới là lịch sử đợt trước, không còn mô tả bản mới.

# Cập nhật sau khi áp dụng gói TV5 đợt 1

Auth đã nối User thật và được mount; xem `docs/api/auth.md` và `TV5-sprint2-push1.md`. Phần dưới là lịch sử hướng dẫn trước khi nhận gói; không dùng mục “Chưa xong toàn bộ” để kết luận Auth vẫn chỉ là đề xuất. History vẫn ở đợt 2. Nhận nền TV2 bằng nhánh TV5, không push vào nhánh TV2.

# Bắt đầu TV5 — Assignment 2

## Sprint 2, bàn giao push đợt 1

Lấy bản tích hợp TV2–TV4 trên `feature/tv2-cart` sau khi nhóm
chuyển bản sửa lên GitHub. Nhánh đó đã chứa nền `feature/tv5-auth-detail`
của Sprint 1. Nếu nhánh TV5 đã có commit mới, hợp nhất bản bàn giao
vào nhánh TV5 để giữ các commit đó.

Với nhánh TV5 đang ở nền Sprint 1, chạy các lệnh sau tại thư mục repo.

```powershell
git fetch origin
git switch feature/tv5-auth-detail
git merge --ff-only origin/feature/tv2-cart
```

Phần TV5 ở lượt này là đăng ký, đăng nhập, hash mật khẩu và JWT guard.
API frontend hiện gọi `POST /api/auth/register` và `POST /api/auth/login`.
Form login cần `accessToken`, `tokenType` và `user` có `id`, `email`.
Schema `User` dùng UUID, email duy nhất và `passwordHash`.

Gắn guard vào `POST /api/orders` trong `apps/api/src/orders/orders.controller.ts`
để xác thực Bearer token và đặt
`request.user.id` bằng UUID của tài khoản đã xác thực. Route lấy chủ
đơn từ trường này. Đặt `NEXT_PUBLIC_API_URL=http://localhost:4000`
ở frontend để các form trỏ tới NestJS khi thử local.

- Gửi yêu cầu thiếu danh tính đã xác thực nhận `401`.
- Khi đã có danh tính hợp lệ, body sai hoặc chứa giá/tổng tiền do khách gửi nhận `400`.
- Body hợp lệ sẽ nhận `503 ORDER_STOCK_NOT_READY` cho tới khi TV4 đăng ký callback giữ kho ở đợt 2. Bài test PostgreSQL dùng principal và callback thử nghiệm để kiểm tra route trả `201`, giá do server tính và gửi lại cùng key chỉ lưu một đơn.
- Lịch sử đơn và test quyền truy cập thuộc đợt 2 của TV5 theo phân công.

Xem [schema, migration và seed](TV2-sprint2-schema.md) và
[API tạo đơn của TV4](TV4-sprint2-push1.md). Sau khi migrate database
thử nghiệm, chạy suite API từ thư mục repo.

```powershell
$env:BREWLITE_ORDERS_TEST_DATABASE_URL = $env:DATABASE_URL
npm run test:e2e -w apps/api -- --runInBand
```

## Tài liệu Sprint 1

Repo: https://github.com/TuanEm2/Assignment2.git
Nền đã kiểm tra: origin/feature/tv4-menu-stock @ 9862594.
Nhánh cá nhân đề nghị: feature/tv5-auth-detail.

## Phạm vi của gói

Trang chi tiết sản phẩm có size/topping/số lượng, tính tạm giá và thêm vào Cart Store TV1; 7 test mới.
Sơ đồ Activity native draw.io và ảnh SVG được xuất trực tiếp từ draw.io. Đây là bản thiết kế để nhóm review, chưa nghiệm thu khi chưa có SRS/UC.
Tài liệu xác định ranh giới TV5 và đầu vào cần tích hợp.
Gói không bao gồm node_modules, .env, secret hoặc source Assignment 1.

## Thực hiện trên PowerShell

Nếu chưa có thư mục này:

```powershell
cd $env:USERPROFILE
git clone https://github.com/TuanEm2/Assignment2.git BrewLite-Assignment2-TV5
cd .\BrewLite-Assignment2-TV5
git fetch origin
git switch --no-track -c feature/tv5-auth-detail origin/feature/tv4-menu-stock
git status --short
git --no-pager log -1 --oneline
```

Nếu đã có thư mục/nhánh thì không clone hoặc tạo nhánh trùng; vào đúng thư mục, kiểm tra status trước. Không chạy trên thư mục Brewlite-TV5 của Assignment 1.
Chỉ áp dụng gói vào nhánh sạch dựa trên nền nêu trên. Nếu có thay đổi local hoặc nhánh nền đã thay đổi, so sánh trước khi giải nén.

Tải ZIP về Downloads; giữ nguyên tên TV5-Assignment2-Detail-Drawio.zip. Ở thư mục gốc Assignment2:

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\TV5-Assignment2-Detail-Drawio.zip" -DestinationPath .
npm.cmd ci
npm.cmd run test -w apps/web
npm.cmd run lint -w apps/web
npm.cmd exec -w apps/web -- next typegen
npm.cmd exec -w apps/web -- tsc --noEmit
npm.cmd run build:web
git status --short
```

Không dùng -Force nếu đã có các file TV5. Đối chiếu trước để tránh ghi đè công việc.
Mở docs/diagrams/activity-order.drawio bằng File → Open from → Device trong draw.io. Không đổi đuôi file HTML thành SVG.
Chưa commit/push cho tới khi bạn kiểm tra kết quả trên máy.

## Chạy API thật và menu

Theo tài liệu ENV/database của repo và bàn giao TV2–TV4. Product Detail gọi API theo NEXT_PUBLIC_API_URL (xem detail.ts).
Menu nền có cờ NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED; bật cờ và dùng nguồn API theo tài liệu Menu TV4 khi thử luồng.
Đọc chính xác tên ENV trong apps/web/src/lib/products/detail.ts và tài liệu nền; không tự sửa URL hoặc secret theo Assignment 1.

## Chưa xong toàn bộ TV5

- Chờ User/Order schema và migration của TV2.
- Chờ Orders service/controller và thống nhất DTO/route của TV3/TV4.
- Sau đó hiện thực Auth/JWT/guards, ownership lịch sử/chi tiết/trạng thái và tests backend.
- Chờ stock/availability contract để xử lý hết hàng ở Detail.
- Đối chiếu Activity với SRS/UC cuối; chạy API/database thật và kiểm tra trình duyệt.

Hiện chỉ xác nhận 23/23 test frontend (16 Menu + 7 Detail), lint, typecheck và build web trên môi trường chuẩn bị. Không suy ra backend hoặc E2E đã đạt.
