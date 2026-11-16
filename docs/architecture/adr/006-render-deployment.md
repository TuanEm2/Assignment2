# ADR 006 — Docker, Render và phân tách local/CI/production

- Ngày: 15/11/2026.
- Trạng thái: đối chiếu source và Render thực tế ngày 16/11/2026; chờ nhóm duyệt tài liệu.

## Bối cảnh

Nhóm cần chạy local và phát hành có thể truy vết, trong khi giảm công quản trị máy chủ và không chia sẻ dữ liệu giữa test với production.

## Quyết định

Docker Compose chạy local PostgreSQL–API–Web. Production thực tế là hai Render Docker Web Services và Render PostgreSQL 16 trong **My Workspace**, region Oregon. Render build hai service từ GitHub Assignment2/main và Dockerfile tương ứng; auto-deploy bật theo commit. Docker Hub cấp base image Node. GitHub Actions CI chạy lint/test/build cho PR/feature.

Source còn có workflow CD build/push GHCR và gọi Render API, nhưng metadata của hai service live là Git/Dockerfile-backed. Đường GHCR này không được vẽ như đang điều khiển deployment hiện tại. [Bằng chứng Task 3.2](../../diagrams/task3.2/deployment-evidence.md) ghi service ID, source, region, port, health và log thực tế.

## Phương án khác

VPS cho phép kiểm soát hạ tầng nhưng cần tự quản lý TLS, cập nhật hệ thống và vận hành DB. Nền tảng khác có thể tương đương nhưng sẽ thay đổi sơ đồ và cấu hình triển khai.

## Hệ quả

Dockerfile giúp tái lập môi trường; Render giảm công hạ tầng nhưng có giới hạn gói và phụ thuộc nền tảng. Các service hiện là Free: không giả định paid pre-deploy đã được cấu hình; API Dockerfile có migration khi startup theo env. Local volume không phải production DB. Database hiện còn external ACL 0.0.0.0/0, đã được ghi đúng trong sơ đồ. Rollback source/image không tự đảo ngược migration. Vì Render theo commit, quy trình nhóm cần kiểm tra CI trước merge main.

## Bằng chứng

`compose.yaml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, `scripts/cd/render-deploy.mjs`.
