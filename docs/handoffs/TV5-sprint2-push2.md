# TV5 — Sprint 2, bàn giao push đợt 2

## Nền và phạm vi

- Repo Assignment2, nhánh cá nhân `feature/tv5-auth-detail`.
- Nhận nền `origin/feature/tv4-menu-stock` tại `afd9c929f88259d031bcccfc33819109b2094cda`.
- Nền chứa TV5 Auth đợt 1 `7f1b11c`, TV6 orchestration `ec2e541`, payment TV1 `5f4214b`, UI TV2 `ab57cbf`, Order TV3 `915bd94`, Inventory TV4 `afd9c92`.
- Thêm History module và mount; GET `/api/orders/me`, `/api/orders/:id`, `/api/orders/:id/status` có real JWT/ownership và adapter Prisma thật.
- Giữ response array cho OrdersView hiện có, phân trang có giới hạn và header cursor; chi tiết dùng snapshot, đọc đúng Payment đã lưu.
- Bổ sung 17 unit test và 10 HTTP/PostgreSQL integration/security tests.
- Không thay service Orders, Inventory, Payments, schema/migration/seed, frontend hoặc sơ đồ của thành viên khác. Migration thứ 4 là của TV4 trong nền nhận, không phải TV5 thêm.
- Phần History chuẩn bị cũ trong local commit `10e095d` đã được thay bằng module nối schema và hợp đồng UI thực tế. Giữ nhánh lưu trữ local; không merge lại commit đó.

## Kết quả trên bản chuẩn bị

Đã chạy trong môi trường chuẩn bị với Node 24.22.1 và PostgreSQL 16.15 local riêng:

| Kiểm tra | Kết quả |
| --- | --- |
| API unit/HTTP fixture | 9 suites, 108 tests PASS |
| Frontend component | 10 files, 58 tests PASS |
| E2E/HTTP | 6 suites, 49 tests PASS, không skip |
| Trong E2E: History mới | 10 tests với database/JWT/hash/controller/service thật |
| Node contract integration | 4 tests PASS; là contract test, không thay E2E |
| Cart calculation | 5 tests PASS |
| Lint API và Web | PASS |
| Production build API và Web | PASS |

API E2E gồm History 10 + Inventory 14 + Orders 10 + Auth 8 dùng PostgreSQL thật; Products 5 + App 2 dùng HTTP fixture. Số phân nhóm cần đối chiếu log khi chạy lại nếu nhóm bổ sung test. Tổng toàn bộ hiện là 49.

**Không ghi `tsc --noEmit` toàn API PASS.** Trên chính nền `afd9c92` chưa có thay đổi TV5 cũng có 7 diagnostics: 2 lỗi kiểu mock/assertion trong `inventory.service.spec.ts`, 5 lỗi khai báo `jest.Mock` trong `payments.service.spec.ts`. Bản History không thêm diagnostics mới. Build API dùng cấu hình production loại test nên vẫn PASS. Giữ nguyên các test nền và báo TV1/TV4 sửa type ở nhánh của họ, không che lỗi bằng tắt kiểm tra.

Chưa kiểm tra thủ công trình duyệt trên máy Windows của thành viên. Chưa coi frontend lịch sử đã nghiệm thu; xem `TV5-TV6-history-integration.md` về lỗi fallback dữ liệu giả của UI TV6.

## Chạy lại

1. Working tree sạch, fetch và merge `--ff-only` đúng nền TV4, áp dụng patch TV5.
2. `npm ci`, `npm run db:generate`, giữ JWT_SECRET hợp lệ trong .env, `npm run db:migrate` trên DB Assignment2 dev. Không reset.
3. Chạy `npm run test -w apps/api -- --runInBand`, `npm run test -w apps/web`, lint và build hai workspace.
4. Migrate DB **test riêng**, đặt 4 biến `BREWLITE_AUTH_TEST_DATABASE_URL`, `BREWLITE_ORDERS_TEST_DATABASE_URL`, `BREWLITE_INVENTORY_TEST_DATABASE_URL`, `BREWLITE_HISTORY_TEST_DATABASE_URL` vào DB local `_test`; `npm run test:e2e -w apps/api -- --runInBand`.
5. Kiểm tra hai tài khoản trên máy cá nhân, rà soát diff trước commit/push nhánh TV5. Nhóm trưởng/TV6 nhận để ráp toàn luồng; không push vào nhánh người khác hay main.

Hợp đồng chi tiết: `docs/api/order-history.md`. Trạng thái nghiệp vụ do TV3 quyết định; kho và hoàn kho do TV4; mock payment TV1; UI/E2E trình duyệt TV6.
