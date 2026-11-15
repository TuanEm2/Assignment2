# ADR 006 — Docker, Render và phân tách local/CI/production

- Ngày: 15/11/2026.
- Trạng thái: Docker/pipeline có trong source; đối chiếu triển khai thật ở Task 3.2.

## Bối cảnh

Nhóm cần chạy local và phát hành có thể truy vết, trong khi giảm công quản trị máy chủ và không chia sẻ dữ liệu giữa test với production.

## Quyết định

Docker Compose chạy local PostgreSQL–API–Web. Nền tảng production được cấu hình trong repo là Render với hai dịch vụ Web/API và PostgreSQL. GitHub Actions CI chạy lint/test/build. Workflow CD được thiết kế build image gắn commit SHA, push GHCR, yêu cầu cấu hình production, deploy API rồi Web và smoke qua HTTPS.

Sự tồn tại của workflow không chứng minh GHCR hay CD đang được dùng trên dịch vụ thật. Task 3.2 phải ghi nhận source/runtime, registry, region, cổng và migration theo bằng chứng live; cấu hình dự kiến được đánh dấu rõ.

## Phương án khác

VPS cho phép kiểm soát hạ tầng nhưng cần tự quản lý TLS, cập nhật hệ thống và vận hành DB. Nền tảng khác có thể tương đương nhưng sẽ thay đổi sơ đồ và cấu hình triển khai.

## Hệ quả

Image giúp tái lập môi trường và truy vết phiên bản. Render giảm công hạ tầng nhưng có giới hạn gói/chi phí và phụ thuộc nền tảng. Pre-deploy chỉ dùng trên gói hỗ trợ; local volume không phải production DB. Rollback dùng image đã biết, không tự đảo ngược migration.

## Bằng chứng

`compose.yaml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, `scripts/cd/render-deploy.mjs`.
