# Bắt đầu TV5 — Assignment 2

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
