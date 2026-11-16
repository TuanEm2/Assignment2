# Task 3.2 — Truy vết deployment về kiến trúc và mã nguồn

Đối chiếu repository tại commit `9715b33d079cf47c5be569bc132c19e0f8dea052`, ngày 16/11/2026. Các mã `DEP-*` tương ứng với nhãn trên [deployment diagram](deployment-production.svg). Bảng này xác minh ranh giới và artifact trong source; chưa thay thế bằng chứng cấu hình của các dịch vụ production.

## 1. Truy vết từng node và container

| Node / container | Thành phần kiến trúc | Mã nguồn / cấu hình triển khai | Điều được xác minh |
| --- | --- | --- | --- |
| `DEP-USER` — thiết bị/trình duyệt | Device và Presentation trong [Task 3.1](../../architecture/task3.1-architecture.md) | [layout.tsx](../../../apps/web/src/app/layout.tsx), [app routes](../../../apps/web/src/app) | Trình duyệt tải UI và gọi API. Không cần một container người dùng trong repo. PWA/offline chưa có, trình duyệt đáp ứng nhánh browser của yêu cầu. |
| `DEP-WEB` — dịch vụ Next.js | Presentation; [ADR 003](../../architecture/adr/003-nextjs-pwa.md) | [Web Dockerfile](../../../apps/web/Dockerfile), [package.json Web](../../../apps/web/package.json), [Web image/deploy job](../../../.github/workflows/cd.yml) | Artifact Web được build từ `apps/web`, start bằng Next.js. Image mặc định PORT 3000; cổng runtime phải theo service thực tế. |
| `DEP-API` — dịch vụ NestJS | HTTP/API, application/domain; [ADR 002](../../architecture/adr/002-modular-monolith.md) | [API Dockerfile](../../../apps/api/Dockerfile), [main.ts](../../../apps/api/src/main.ts), [app.module.ts](../../../apps/api/src/app.module.ts), [API image/deploy job](../../../.github/workflows/cd.yml) | API đọc `PORT`, source fallback 4000. Orders/Inventory/Payments/Auth là module trong cùng tiến trình. |
| `DEP-API` — mock payment trong API | Dịch vụ thanh toán logic; [ADR 005](../../architecture/adr/005-payment-modes.md) | [payments.module.ts](../../../apps/api/src/payments/payments.module.ts), [payments.service.ts](../../../apps/api/src/payments/payments.service.ts) | Không có image/container mock payment riêng; code chỉ mở chế độ mock khi cấu hình cho phép. |
| `DEP-DB` — PostgreSQL và storage | Persistence; [ADR 004](../../architecture/adr/004-postgres-prisma.md) | [schema.prisma](../../../apps/api/prisma/schema.prisma), [Prisma service](../../../apps/api/src/prisma/prisma.service.ts), [migrations](../../../apps/api/prisma/migrations), [DATABASE_URL mẫu](../../../.env.example) | Schema và driver PostgreSQL có trong source. DB production/storage là tài nguyên nền tảng; không có module ứng dụng tự giả lập DB. |
| `DEP-EDGE` — HTTPS ingress | Vận hành/network boundary; [ADR 006](../../architecture/adr/006-render-deployment.md) | [HTTPS URL gate và deploy job](../../../.github/workflows/cd.yml), [live HTTPS smoke](../../../tests/smoke/production-smoke.mjs), [CORS API](../../../apps/api/src/main.ts) | Ingress/TLS là thành phần Render quản lý, không phải Nginx container đã được định nghĩa trong repo. Hai public origins phải khớp URL Web/API thật. |
| `DEP-CI` — runner và pipeline | Vận hành / quality gate; [ADR 006](../../architecture/adr/006-render-deployment.md) | [ci.yml](../../../.github/workflows/ci.yml), [cd.yml](../../../.github/workflows/cd.yml), [render-deploy.mjs](../../../scripts/cd/render-deploy.mjs) | Runner build/test và phát hành; không chứa database/app production thường trực. Luồng CD thực tế cần đối chiếu cấu hình service. |
| `DEP-REG` — GHCR | Artifact repository; [ADR 006](../../architecture/adr/006-render-deployment.md) | [build-push và image URLs](../../../.github/workflows/cd.yml), [kiểm tra image URL](../../../scripts/cd/validation.mjs) | Repo cấu hình hai image `assignment2-api:<SHA>` và `assignment2-web:<SHA>`. Chưa suy ra service live đang pull hai image này. |
| `DEP-LOCAL` — container `web` | Cùng Presentation với Web production, môi trường local | [Compose service web](../../../compose.yaml), [Web Dockerfile](../../../apps/web/Dockerfile) | Local host 3000, container 3000 theo mặc định; build với API URL dùng trên máy host. |
| `DEP-LOCAL` — container `api` | Cùng application/domain với API production, môi trường local | [Compose service api](../../../compose.yaml), [API Dockerfile](../../../apps/api/Dockerfile) | Local host/container 4000; kết nối DB qua Docker network, không đi qua public Render API. |
| `DEP-LOCAL` — container `postgres` / `postgres_data` | Persistence local | [Compose service postgres và volume](../../../compose.yaml) | PostgreSQL 16, container 5432, bind host `127.0.0.1:5433`; named volume local tách DB production. |

## 2. Các artifact vận hành trên sơ đồ

| Artifact / tính năng | Kiến trúc | Nguồn |
| --- | --- | --- |
| Secret/env backend và build Web | [ADR 007](../../architecture/adr/007-observability-configuration.md) | [.env.example](../../../.env.example), [main.ts](../../../apps/api/src/main.ts), [auth/access-tokens.ts](../../../apps/api/src/auth/access-tokens.ts), [Web Dockerfile](../../../apps/web/Dockerfile) |
| Health `/api/health` | Liveness trong Task 3.1 và ADR 007 | [app.controller.ts](../../../apps/api/src/app.controller.ts), [app.service.ts](../../../apps/api/src/app.service.ts), [Compose probe](../../../compose.yaml) |
| Log tiến trình và CI/CD | Vận hành trong Task 3.1 và ADR 007 | [Nest bootstrap](../../../apps/api/src/main.ts), [Next start command](../../../apps/web/Dockerfile), [workflow](../../../.github/workflows/cd.yml), [deploy polling](../../../scripts/cd/render-deploy.mjs) |
| Migration | Persistence / phát hành | [db:migrate script](../../../apps/api/package.json), [migrations](../../../apps/api/prisma/migrations), [startup migration local](../../../apps/api/Dockerfile), [pre-deploy gate trong CD](../../../.github/workflows/cd.yml) |

Log tập trung riêng, request logging đầy đủ, DB readiness, backup schedule và service instances production không được coi là đã được triển khai chỉ vì source có Dockerfile/workflow.

## 3. Đối chiếu tiêu chí trong đề

| Yêu cầu | Vị trí thể hiện | Kết quả kiểm tra source |
| --- | --- | --- |
| Thiết bị chạy browser/PWA | `DEP-USER` | Có browser. PWA cài đặt/offline chưa có; yêu cầu browser/PWA không bắt buộc cả hai. |
| Dịch vụ/CDN phục vụ Next.js | `DEP-WEB` | Có dịch vụ Next.js. Không thêm CDN độc lập khi repo không định nghĩa. |
| Container/dịch vụ NestJS API | `DEP-API` | Có. |
| PostgreSQL có persistent storage | `DEP-DB`; volume local trong `DEP-LOCAL` | Mô hình có. Phải đối chiếu tài nguyên DB/storage production để xác nhận thực tế. |
| Registry và nền tảng triển khai | `DEP-REG`, Render production boundary | Repo cấu hình GHCR/Render. Cần chứng minh đường deploy service thật tương ứng. |
| HTTPS, nội bộ và cổng | Các communication paths, bảng cổng trong [thuyết minh](task3.2-deployment.md) | Có HTTPS 443, HTTP PORT, PostgreSQL 5432; cổng local tách riêng. PORT production cần đối chiếu. |
| Secret/env, health và log | Legend, artifact vận hành và thuyết minh | Có tên biến/probe/log; không chứa giá trị secret. |
| Ranh giới local/CI/production | Ba frame của sơ đồ | Có. |
| Mỗi dịch vụ truy về kiến trúc/code | Bảng mục 1 và 2 ở trên | Có; bao gồm cả ba container local và thành phần do nền tảng quản lý. |
| Phản ánh nền tảng production thực tế | Bằng chứng dịch vụ live | **Chưa xác minh từ repo; chưa đủ để nghiệm thu điều kiện này.** |

**Kết luận tại thời điểm đối chiếu source:** các thành phần và quan hệ truy vết đã có; điều kiện phản ánh production thực tế còn cần đối chiếu. Không đánh dấu đạt toàn bộ hoặc coi CI xanh là bằng chứng topology đang chạy.
