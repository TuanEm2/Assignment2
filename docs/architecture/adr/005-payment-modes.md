# ADR 005 — Mock payment trong API và PayOS có điều kiện

- Ngày: 15/11/2026.
- Trạng thái: cả hai đường xử lý có trong source; chế độ chạy production phải xác minh riêng.

## Bối cảnh

Đề bài cần thanh toán mô phỏng để demo/test kết quả thành công và thất bại. Source còn có tích hợp PayOS cần phân biệt rõ với mô phỏng.

## Quyết định

Đặt mock payment trong `PaymentsModule`, chỉ mở khi `PAYMENT_MODE=mock`. Backend đọc tổng tiền từ database, xác thực chủ đơn, dùng transaction/khóa và lưu idempotency key. PayOS tách trong `PayosModule`, yêu cầu các cổng cấu hình `PAYMENT_MODE=payos` và `PAYOS_ENABLED=true`; chỉ công nhận kết quả đã xác minh phía backend.

## Phương án khác

Tách mock thành một container riêng tăng network/deployment không cần thiết cho bài. Luôn gọi cổng thật tăng phụ thuộc, bí mật và khó kiểm thử các kịch bản lỗi xác định.

## Hệ quả

Demo có kết quả lặp lại và không thu tiền thật trong mock mode. Mock không chứng minh quy trình thanh toán ngân hàng. PayOS thêm dependency nhà cung cấp, webhook và đối soát; không suy ra trạng thái bật production từ code hay `.env.example`.

## Bằng chứng

`apps/api/src/payments/payments.service.ts`, `payos/payos.service.ts`, `payos/payos-crypto.ts`, `.env.example`.
