# ADR 007 — Cấu hình môi trường, liveness và logging

- Ngày: 15/11/2026.
- Trạng thái: env/liveness/logger mặc định đang có; request logging/readiness đầy đủ là đề xuất.

## Bối cảnh

Local, CI và production cần URL, secret và cách quan sát khác nhau. Một tiến trình trả HTTP thành công chưa chắc database hoặc checkout hoạt động.

## Quyết định

Đọc cấu hình từ biến môi trường; `.env.example` chỉ mô tả tên biến. Bí mật chỉ cấp cho backend/pipeline cần dùng; `NEXT_PUBLIC_*` phải là dữ liệu công khai. Dùng `/api/health` làm liveness, smoke test cho hành vi dịch vụ. Thu log tiến trình qua stdout/stderr của môi trường chạy. Đề xuất bổ sung request ID, log có cấu trúc và readiness phù hợp.

## Phương án khác

Hardcode secret/URL làm các môi trường khó tách và khó luân chuyển. Một health check chạy toàn bộ nghiệp vụ có thể chậm, tạo side effect và gây restart không cần thiết.

## Hệ quả

Cấu hình không cần sửa code, probe nhẹ và không ghi dữ liệu. Cần quản lý secret theo môi trường, rebuild Next.js khi đổi public URL và kiểm thử dependency riêng. Source chưa có hệ thống log tập trung hay middleware log request đầy đủ; tài liệu không coi các phần này đã hoàn thành.

## Bằng chứng

`apps/api/src/main.ts`, `app.controller.ts`, `app.service.ts`, `auth/access-tokens.ts`, `.env.example`, `tests/smoke/production-smoke.mjs`.
