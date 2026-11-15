# ADR 004 — PostgreSQL, Prisma và migration có phiên bản

- Ngày: 15/11/2026.
- Trạng thái: ghi nhận hiện trạng source; cấu hình production đối chiếu riêng ở Task 3.2.

## Bối cảnh

Đặt hàng cần bảo đảm giá, nguyên liệu và thanh toán nhất quán dưới các request đồng thời. Schema phải thay đổi có lịch sử và triển khai được nhiều môi trường.

## Quyết định

Chọn PostgreSQL và Prisma. Commit schema/migration SQL; sinh client bằng `db:generate`; áp dụng migration bằng `db:migrate` (`prisma migrate deploy`). Dùng transaction, khóa hàng và unique constraints cho tồn kho, order/payment idempotency. Dữ liệu production dùng storage bền vững của PostgreSQL, không lưu vào filesystem tạm của API.

## Phương án khác

NoSQL không phù hợp bằng với quan hệ và transaction hiện tại. SQL thủ công cho toàn bộ persistence tăng quyền kiểm soát nhưng tăng công mapping và quản lý kiểu. Prisma không loại bỏ nhu cầu SQL/khóa khi xử lý concurrency.

## Hệ quả

Có lịch sử schema và ràng buộc dữ liệu rõ. Cần thiết kế migration tương thích ngược, backup/restore và giới hạn kết nối. Seed là thao tác riêng. Rollback ứng dụng không khôi phục schema/dữ liệu. Local Compose chạy migration lúc API start; pre-deploy production chỉ dùng khi được cấu hình và gói dịch vụ hỗ trợ.

## Bằng chứng

`apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations`, `orders/orders.service.ts`, `inventory/inventory.service.ts`, `apps/api/Dockerfile`.
