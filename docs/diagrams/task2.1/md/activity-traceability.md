# Truy vết đóng góp Task 2.1 — Activity của Phú Lâm

Baseline: `main f119683`. FR/AC lấy từ SRS của Huy; tên alias UC lấy từ sơ đồ của Trần Ân. Đây là bảng đóng góp để người tổng hợp nhập vào ma trận chung, không thay thế ma trận toàn nhóm hoặc tự cấp mã UC/NFR.

Các cụm AC dưới đây là tóm tắt điều kiện chấp nhận tương ứng trong từng FR, không phải bộ AC mới. Node ID là ID trong trang `.drawio` (mỗi trang có namespace riêng), giúp tìm chính xác phần sơ đồ khi review.

Quy ước đường dẫn: mặc định `apps/api/src/`; `web:` = `apps/web/src/`; `e2e:` = `apps/api/test/`; `tests/` tính từ root. Tên file kiểm thử chỉ là địa chỉ minh chứng hiện có, **không chứng nhận mọi AC đều có assertion riêng hoặc đã chạy đạt trong lần sửa tài liệu này**.

| FR | AC/luồng cần truy vết | Activity / node | UC alias trong đầu vào | Code | Test tham chiếu |
|---|---|---|---|---|---|
| FR-01 | Menu loading/rỗng/lỗi; không demo fallback | ACT-01: open/load/api/res/empty/err/menu | UC_ViewMenu | products/products.service.ts; web: app/menu/menu.tsx | products/products.service.spec.ts; web: app/menu/menu.test.tsx |
| FR-02 | Tìm không dấu/case; category có điều kiện | ACT-01: menu/filter/noresults/clearfilter | UC_SearchFilter | web: app/menu/menu.tsx | web: app/menu/menu.test.tsx |
| FR-03 | Chi tiết, size/topping, quantity 1–99 | ACT-01: detail/exists/options/valid | UC_ViewDetail, UC_Customize | web: app/products/[id]/product-detail.tsx; web: lib/products/detail.ts | web: app/products/[id]/product-detail.test.tsx |
| FR-04 | Thêm, gộp cùng cấu hình, persist và max99 | ACT-01: valid/cart | UC_ManageCart | web: stores/cart-store.ts | tests/cart-calculations.test.mjs; web: app/products/[id]/product-detail.test.tsx |
| FR-05 | Sửa/xóa giỏ, tính tạm tính, chặn giỏ rỗng | ACT-01: edit/calc/nonempty/cartempty | UC_ManageCart | web: app/cart/cart-view.tsx; web: stores/cart-store.ts | web: app/cart/cart-view.test.tsx |
| FR-06 | Register email chuẩn hóa/unique, hash và body | ACT-02: reg/rvalid/regapi/regres/regerr/regok | UC_Register | auth/auth.dto.ts; auth/auth.service.ts; auth/prisma-auth-users.ts; auth/password-hasher.ts | auth/auth-http.spec.ts; auth/password-hasher.spec.ts; e2e: auth-postgres.e2e-spec.ts |
| FR-07 | Login JWT; chặn token sai/hết hạn và protected API | ACT-00: session/auth; ACT-02: login/loginapi/loginres/jwt/protected/tok; ACT-03: guard; ACT-04: validate; ACT-05: read | UC_Login, UC_Auth | auth/access-tokens.ts; auth/jwt-auth.guard.ts; auth/current-user.decorator.ts | auth/auth-http.spec.ts; e2e: auth-postgres.e2e-spec.ts |
| FR-08 | Tạo PENDING đúng chủ; lỗi body/JWT/món | ACT-03: send/guard/valid/new/reserve/rollback/result | UC_Checkout | orders/orders.controller.ts; orders/orders.service.ts | orders/orders.controller.spec.ts; orders/orders.service.spec.ts; e2e: orders-postgres.e2e-spec.ts |
| FR-09 | Giá server và snapshot không đổi theo catalog | ACT-03: new/reserve/commit; ACT-05: snapshot/display | UC_Checkout, UC_OrderDetail | orders/orders.service.ts; order-history/order-history.service.ts | orders/orders.service.spec.ts; e2e: history-postgres.e2e-spec.ts |
| FR-10 | Giữ nguyên liệu tổng hợp trong transaction; 409/503 rollback | ACT-03: reserve/commit/stock/rollback | UC_ReserveInventory | inventory/inventory.service.ts; orders/orders.service.ts | inventory/inventory.service.spec.ts; e2e: inventory-postgres.e2e-spec.ts |
| FR-11 | Không oversell khi yêu cầu đồng thời | ACT-03: reserve/stock/commit (kiểm soát nguyên tử) | UC_ReserveInventory | inventory/inventory.service.ts | e2e: inventory-postgres.e2e-spec.ts |
| FR-12 | Idempotency-Key theo chủ+nội dung; replay/conflict | ACT-03: key/replay/same/conflict/old/new | UC_Checkout | orders/orders.controller.ts; orders/orders.service.ts | orders/orders.service.spec.ts; e2e: orders-postgres.e2e-spec.ts |
| FR-13 | Mock Wallet/Card, SUCCESS/FAILURE, amountDB/idempotency | ACT-04: choose/send/validate/accept/process/received/known | UC_Payment, UC_Wallet, UC_Card | payments/payments.controller.ts; payments/payments.service.ts | payments/payments.service.spec.ts; tests/integration/checkout-e2e-flow.test.mjs |
| FR-14 | Giữ giỏ; retry cùng order/key, payment key mới; unknown chặn | ACT-04: fail/retry/newkey/unknown/check/status/confirmedfail/success | UC_RetryPayment, UC_CheckPaymentStatus | web: lib/checkout/use-checkout-orchestrator.ts | web: lib/checkout/checkout-orchestrator.test.ts; web: app/checkout/checkout-view.test.tsx; **GAP-04 cần thêm case mất phản hồi sau commit FAILURE** |
| FR-15 | History đúng chủ, mới nhất, rỗng/401 | ACT-05: fetch/read/ok/error/list | UC_ViewOrders | order-history/order-history.controller.ts; order-history/order-history.service.ts | order-history/order-history.service.spec.ts; e2e: history-postgres.e2e-spec.ts; web: app/orders/orders-view.test.tsx |
| FR-16 | Detail/status đúng chủ, snapshot; 404/400/401 | ACT-05: detail/found/denied/readmode/snapshot/display/statusonly | UC_OrderDetail, UC_CheckPaymentStatus | order-history/order-history.controller.ts; order-history/order-history.service.ts | e2e: history-postgres.e2e-spec.ts; web: app/orders/[id]/order-detail-content.test.tsx |
| FR-17 | availableCups theo recipe; unknown vẫn kiểm tra backend | ACT-01: api/estimate/valid; ACT-03: reserve/stock | UC_ViewMenu, UC_Customize, UC_ReserveInventory | products/availability.ts; products/products.service.ts; web: lib/products/detail.ts | products/availability.spec.ts; products/products.service.spec.ts; web: app/products/[id]/product-detail.test.tsx |
| FR-18 | limit/cursor và owner cursor, X-Next-Cursor | ACT-05: fetchmerge/fetch/read/list/action/more | UC_ViewOrders | order-history/order-history.controller.ts; order-history/order-history.service.ts | order-history/order-history.service.spec.ts; e2e: history-postgres.e2e-spec.ts |

## Giới hạn và bước chốt

- FR-14: mô hình thể hiện quy tắc mong muốn, còn GAP-04 ở code. Chưa đánh dấu hoàn tất AC cho nhánh mất phản hồi thanh toán.
- FR-11 không được coi đã kiểm tra concurrency chỉ vì sơ đồ có transaction; dùng test PostgreSQL với dữ liệu cô lập và assertion tồn thực.
- Category ở FR-02 là điều kiện tùy dữ liệu, không tự khẳng định API hiện có category.
- Staff/Admin cập nhật trạng thái và quản lý nguyên liệu trong Use Case chưa có FR/API vận hành tương ứng; không gắn nhầm vào FR-15/16 xem đơn.
- Khi nhận NFR và hai đặc tả UC đã duyệt, bổ sung mã chính thức và AC/test cụ thể. Không đổi mã FR của Huy.
- Điểm sai khác với Sequence/Use Case nằm trong `activity-consistency-review.md`; cần sửa đồng bộ trước khi coi bộ thiết kế thống nhất.

Bảng `activity-ac-coverage.md` phân rã thêm từng mã AC để tránh chỉ truy vết ở mức FR. Quy tắc và bất biến của node nằm tại `activity-flow-contract.md`.
