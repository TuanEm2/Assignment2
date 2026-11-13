# TV5 — Bàn giao Sprint 2, push đợt 1

## Nhận nền đúng

`feature/tv2-cart` @ `1dd020d` đã chứa TV3/TV4 và bổ sung kho `f2e8b5b`. Nhận code nhánh này làm nền, tiếp tục làm trên **feature/tv5-auth-detail**, không push vào nhánh TV2. Không cần TV3/TV4 làm lại đợt 1 để chờ kho nguyên liệu.

## Phần TV5 đợt này

- Auth register/login/name tùy chọn, validation, password hash, JWT và guard.
- PrismaAuthUsers nối đúng User schema TV2; P2002 đúng unique email map thành 409.
- UsersPersistenceModule cung cấp AuthUsers cho AuthModule và guard.
- Mount Auth vào AppModule; gắn guard ở POST /orders, không tin userId từ client.
- Test cơ bản và test PostgreSQL để kiểm chứng phần đã bàn giao; đồng bộ harness E2E ESM với Nest 12.

Không đưa History API vào đợt 1. Không đổi migration/schema/seed/giá/state machine/callback kho của TV2–TV4. Request tạo đơn đã xác thực vẫn có thể trả ORDER_STOCK_NOT_READY cho tới khi TV4 nối callback đợt 2.

## Kết quả trên môi trường chuẩn bị ngày 13/11/2026

- Backend unit/HTTP: 6 suites, **72 tests PASS**.
- Frontend component: 8 files, **49 tests PASS**.
- Contract integration TV6: **4 tests PASS** (không gọi đây là E2E toàn hệ thống).
- Cart logic TV1: **5 tests PASS**.
- PostgreSQL **16.15 thật**, riêng một cluster test: áp dụng đủ 3 migration TV2; toàn bộ E2E/HTTP **4 suites, 24 tests PASS, không skip**. Auth (8) và Orders (9) dùng PostgreSQL thật; Health (2) và Products (5) kiểm tra HTTP với dependency DB giả lập. Trong đó Auth DB có 8 ca: lưu hash/name/role, email trùng đồng thời, restart, sai login, validation/role, guard Orders/503, JWT lỗi, user đã xóa.
- Lint hai workspace, API TypeScript và build API/Web PASS.
- Chưa xác nhận giao diện thật trên trình duyệt của người nhận, chưa chạy kho nguyên liệu thật vì callback chưa có. Chưa nghiệm thu toàn Sprint 2 hoặc production.

## Hợp đồng cho TV6

Đọc docs/api/auth.md. Login trả accessToken, tokenType, expiresIn và user (id,email,name?). Register trả user, không accessToken, UI chuyển về login. Dùng NEXT_PUBLIC_API_URL=http://localhost:4000; các form tự thêm /api. API không yêu cầu JWT cho menu/chi tiết/register/login/health, chỉ các route được gắn guard.

## Đợt 2

Sau tích hợp/review đợt 1: nối reader Order History theo schema thật, GET orders/me và orders/:id theo quyền, kiểm tra hai tài khoản và projection/snapshot/phân trang. Tích hợp với kho/payment/UI mới, mở rộng test và cập nhật Activity theo nghiệp vụ đã chốt. Không gộp code History từ commit chuẩn bị local vào lần push đợt 1.
