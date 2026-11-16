# Task 3.2 — Truy vết và tiêu chí nghiệm thu

Đối chiếu ngày 16/11/2026 với source `fd9211599033519c7e96c60bf8ff26a4b0325b33` và [bằng chứng Render/HTTP](deployment-evidence.md). Các mã DEP-* khớp nhãn trên [UML deployment diagram](deployment-production.svg).

## 1. Mỗi node/dịch vụ về kiến trúc và code

| Node / dịch vụ | Thành phần kiến trúc | Source / cấu hình truy vết | Bằng chứng thực tế |
| --- | --- | --- | --- |
| DEP-USER — thiết bị/browser | Device, Presentation trong [Task 3.1](../../architecture/task3.1-architecture.md) | [layout.tsx](../../../apps/web/src/app/layout.tsx), [Web routes](../../../apps/web/src/app) | Web/menu HTTP 200; browser là thiết bị khách, không phải container cần triển khai trong repo. |
| DEP-SOURCE — GitHub main | Monorepo; [ADR 001](../../architecture/adr/001-monorepo.md) | [package.json](../../../package.json), [repo workspaces](../../../apps) | Hai service Render cùng trỏ repo Assignment2/main. |
| DEP-CI — GitHub Actions runner | Quality gate / vận hành; [ADR 006](../../architecture/adr/006-render-deployment.md) | [ci.yml](../../../.github/workflows/ci.yml) | Workflow lint/test/build trên PR/feature; không phải máy production. |
| DEP-REG — Docker Hub registry | Container base artifacts; ADR 006 | [API Dockerfile](../../../apps/api/Dockerfile), [Web Dockerfile](../../../apps/web/Dockerfile), [Compose](../../../compose.yaml) | Hai Dockerfile FROM node:26-bookworm-slim; local PostgreSQL dùng postgres:16-alpine. |
| DEP-BUILD — Render Docker build | Build/release, ADR 006 | Hai Dockerfile ở trên, context gốc repo | Metadata runtime docker, source main, đúng Dockerfile, auto-deploy trigger commit. Đây là pipeline được Render quản lý, không phải microservice ứng dụng tự viết. |
| DEP-WEB — Next.js service | Presentation; [ADR 003](../../architecture/adr/003-nextjs-pwa.md) | [Web Dockerfile](../../../apps/web/Dockerfile), [Web package.json](../../../apps/web/package.json), [app](../../../apps/web/src/app) | Service Web đúng URL; startup/detector log xác nhận port 10000. |
| DEP-API — NestJS service | HTTP/API và domain; [ADR 002](../../architecture/adr/002-modular-monolith.md) | [API Dockerfile](../../../apps/api/Dockerfile), [main.ts](../../../apps/api/src/main.ts), [app.module.ts](../../../apps/api/src/app.module.ts) | Service API đúng URL/Dockerfile, health path /api/health, port 10000 trong log. |
| DEP-API — PaymentsModule | Mock payment logic; [ADR 005](../../architecture/adr/005-payment-modes.md) | [payments.module.ts](../../../apps/api/src/payments/payments.module.ts), [payments.service.ts](../../../apps/api/src/payments/payments.service.ts) | Module nằm trong NestJS process; không vẽ container/cổng mock payment bên ngoài. Mode phụ thuộc cấu hình. |
| DEP-DB — PostgreSQL/storage | Persistence; [ADR 004](../../architecture/adr/004-postgres-prisma.md) | [schema.prisma](../../../apps/api/prisma/schema.prisma), [PrismaService](../../../apps/api/src/prisma/prisma.service.ts), [migrations](../../../apps/api/prisma/migrations), [DATABASE_URL mẫu](../../../.env.example) | Đúng DB ID, PostgreSQL 16/available/Oregon; datasource log là internal host. External ACL được ghi riêng, không giả định DB private-only. |
| DEP-EDGE — Render HTTPS ingress | Managed network/ingress, ADR 006 | [CORS/main.ts](../../../apps/api/src/main.ts), [live smoke URLs](../../../tests/smoke/production-smoke.mjs), [config Web](../../../apps/web/Dockerfile) | Public HTTPS Web/API hoạt động; CORS khớp frontend. Edge/TLS thuộc Render, không phải một Nginx container trong repo. |
| DEP-LOCAL — container web | Presentation local | [Compose service web](../../../compose.yaml), Web Dockerfile | Host/container 3000 theo Compose; tách môi trường production. |
| DEP-LOCAL — container api | Domain/API local | [Compose service api](../../../compose.yaml), API Dockerfile | Host/container 4000; DB qua Docker network. |
| DEP-LOCAL — postgres / postgres_data | Persistence local | [Compose service postgres và volume](../../../compose.yaml) | PostgreSQL 16, container 5432, host 127.0.0.1:5433; named volume local. |

## 2. Artifact vận hành

| Artifact | Kiến trúc | Source / bằng chứng |
| --- | --- | --- |
| Env/secret backend và build Web | [ADR 007](../../architecture/adr/007-observability-configuration.md) | [.env.example](../../../.env.example), [main.ts](../../../apps/api/src/main.ts), [JWT](../../../apps/api/src/auth/access-tokens.ts), Web Dockerfile. Chỉ ghi tên biến. |
| Health | Liveness / vận hành | [app.controller.ts](../../../apps/api/src/app.controller.ts), [app.service.ts](../../../apps/api/src/app.service.ts); Render API health path và HTTP 200 đã kiểm tra. |
| Log | Vận hành/ADR 007 | [Nest bootstrap](../../../apps/api/src/main.ts), Web start trong Dockerfile; app/build logs Render đã đọc. |
| Migration | Persistence/release | [db:migrate script](../../../apps/api/package.json), [migration SQL](../../../apps/api/prisma/migrations), startup command trong API Dockerfile; datasource log đã đọc. |
| Đường GHCR có trong source | Đường CD khác, không phải hai service live hiện tại | [cd.yml](../../../.github/workflows/cd.yml), [render-deploy.mjs](../../../scripts/cd/render-deploy.mjs). Không ánh xạ nhầm thành luồng pull image production. |

## 3. Đối chiếu từng yêu cầu trong ảnh đề bài

| Yêu cầu | Vị trí thể hiện | Kết quả |
| --- | --- | --- |
| Thiết bị chạy browser/PWA | DEP-USER | Đạt với browser; không khẳng định có PWA/offline. |
| Dịch vụ/CDN phục vụ Next.js | DEP-WEB | Đạt bằng Render Web Service; không cần thêm CDN độc lập. |
| Container/dịch vụ NestJS API | DEP-API | Đạt. |
| PostgreSQL có persistent storage | DEP-DB; DEP-LOCAL phân biệt volume local | Đạt về mô hình dịch vụ managed/storage; không gán storage vào API. |
| Registry và nền tảng triển khai | DEP-REG, DEP-BUILD, Render production boundary | Đạt; registry/base image và Git Docker build được truy về Dockerfile/metadata. |
| HTTPS, kết nối nội bộ và cổng | DEP-EDGE, API→DB và bảng port | Đạt: HTTPS 443, app 10000, internal DB 5432, local ports tách riêng; external DB access cũng được thể hiện. |
| Secret/env, health check và log | Legend và thuyết minh vận hành | Đạt ở mức mô tả/nguồn/bằng chứng; không chứa secret. |
| Ranh giới local, CI, production | Các frame UML | Đạt. |
| Phản ánh nền tảng thực tế | Metadata My Workspace, log và HTTP | Đạt theo snapshot ngày 16/11/2026; không dựa vào workspace Assignment 1 hoặc GHCR mẫu. |
| Mỗi container/service về kiến trúc và code | Bảng mục 1, mã DEP-* | Đạt; bao gồm cả các thành phần managed của nền tảng và ba container local. |

**Kết luận:** đủ yêu cầu của deployment diagram và khả năng truy vết trong phạm vi đề đã cung cấp. Kết luận không thay thế nghiệm thu toàn bộ ứng dụng hoặc NFR bảo mật; DB external ACL 0.0.0.0/0 là hiện trạng vận hành còn mở đã ghi rõ trên sơ đồ.
