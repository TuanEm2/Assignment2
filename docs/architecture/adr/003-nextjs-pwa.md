# ADR 003 — Next.js web responsive và PWA theo giai đoạn

- Ngày: 15/11/2026.
- Trạng thái: Next.js đang có; PWA/offline là đề xuất, chưa triển khai.

## Bối cảnh

Người dùng truy cập bằng desktop và điện thoại. Nhóm cần một frontend cho menu, giỏ hàng, checkout và lịch sử đơn mà không duy trì thêm ứng dụng native.

## Quyết định

Chọn Next.js/React cho web, Zustand cho trạng thái tương tác. Xác thực giá, quyền sở hữu và thanh toán thuộc backend. Giữ PWA là bước mở rộng có manifest/service worker riêng khi cần; không coi web responsive hiện tại là PWA đã hoàn thiện.

## Phương án khác

SPA thuần giảm nhu cầu Next.js server nhưng thay đổi cách render/deploy. Native mobile tăng khả năng dùng API thiết bị nhưng tạo thêm codebase và quy trình phát hành.

## Hệ quả

Dùng chung UI và routing, hỗ trợ server/client rendering. `NEXT_PUBLIC_*` là cấu hình công khai ở build time, phải rebuild khi đổi API URL. PWA cần kiểm soát cache/version; đặt đơn/thanh toán không được xác nhận chỉ bằng dữ liệu offline. Source hiện chưa có manifest hoặc service worker.

## Bằng chứng

`apps/web/package.json`, `apps/web/src/app`, `apps/web/src/stores`, `apps/web/Dockerfile`, `apps/web/next.config.ts`.
