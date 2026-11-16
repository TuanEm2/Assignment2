# ADR 001 — Monorepo với npm workspaces

- Ngày: 15/11/2026.
- Trạng thái: ghi nhận quyết định đang được triển khai trong source; chờ nhóm duyệt tài liệu.

## Bối cảnh

Frontend và API của BrewLite thay đổi cùng nhau theo các luồng catalog, checkout và thanh toán. Nhóm cần chia phần việc nhưng vẫn kiểm tra một phiên bản tích hợp có thể truy vết.

## Quyết định

Giữ `apps/web` và `apps/api` trong cùng repository, dùng npm workspaces `apps/*`, một lockfile và các script root cho build, lint, test, migration. `docs` lưu tài liệu; `tests` lưu kiểm thử dùng chung/tích hợp.

## Phương án khác

Tách nhiều repository giúp phát hành và phân quyền riêng nhưng tăng công phối hợp version, hợp đồng API và kiểm thử tích hợp. Chưa chọn khi nhóm nhỏ và các phần nghiệp vụ phụ thuộc nhau.

## Hệ quả

Một commit ghi nhận được thay đổi xuyên frontend/backend; CI có thể kiểm tra cả ứng dụng. Đổi lại, dependency/build có thể tác động nhiều workspace và cần quy tắc review theo phạm vi. Monorepo không có nghĩa frontend/backend phải chạy trong cùng container.

## Bằng chứng

`package.json`, `package-lock.json`, `apps/web`, `apps/api`, `.github/workflows/ci.yml`.
