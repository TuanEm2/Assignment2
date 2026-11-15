# ADR 002 — Backend NestJS theo module và phân lớp

- Ngày: 15/11/2026.
- Trạng thái: ghi nhận hiện trạng source; chờ nhóm duyệt tài liệu.

## Bối cảnh

Đơn hàng, tồn kho và thanh toán cần phối hợp quy tắc và transaction. Vận hành nhiều dịch vụ độc lập sẽ thêm giao tiếp mạng, consistency và deployment phức tạp.

## Quyết định

Dùng một NestJS API với các module Auth, Products, Orders, Inventory, Payments, OrderHistory, PayOS và Prisma. Tổ chức theo luồng controller/guard → service nghiệp vụ → Prisma/PostgreSQL. Các module là ranh giới logic, không phải microservice.

## Phương án khác

Microservices cho phép scale/deploy riêng nhưng cần xử lý distributed transaction, retry và quan sát nhiều tiến trình. Backend không phân module dễ bắt đầu nhưng khó kiểm soát phụ thuộc khi chức năng tăng.

## Hệ quả

Transaction nội bộ đơn giản, dễ kiểm thử và phù hợp quy mô nhóm. API vẫn có một đơn vị triển khai, một lỗi tài nguyên có thể tác động nhiều module. Cần giữ phụ thuộc rõ ràng; chỉ tách dịch vụ khi có nhu cầu độc lập được đo lường.

## Bằng chứng

`apps/api/src/app.module.ts`, `orders/orders.module.ts`, `payments/payments.module.ts`.
