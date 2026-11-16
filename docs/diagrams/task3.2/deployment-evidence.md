# Task 3.2 — Bằng chứng production ngày 16/11/2026

Phạm vi: đọc metadata/log Render trong **My Workspace** đã được chủ dự án xác nhận; đọc source; gọi HTTP GET/OPTIONS công khai. Không tạo/sửa service, env, ACL, database hoặc dữ liệu nghiệp vụ.

## 1. Metadata Render đã đọc

| Tài nguyên | Metadata quan sát được |
| --- | --- |
| Workspace | **My Workspace**, tài khoản có quyền truy cập đúng ba tài nguyên Assignment 2 bên dưới. Không dùng dữ liệu từ Em's workspace. |
| API | `srv-dbsnuf1srm7s73dsl390`, tên Assignment2, URL <https://assignment2-19nq.onrender.com>, Web Service, runtime Docker, Oregon, plan Free, 1 instance. Repo `https://github.com/TuanEm2/Assignment2`, branch main, root context `.`, Dockerfile `apps/api/Dockerfile`; autoDeploy yes, trigger commit. Health path `/api/health`. |
| Web | `srv-dbso1gm7bikc73c0h2r0`, tên Assignment2 - web, URL <https://assignment2-web.onrender.com>, Web Service, runtime Docker, Oregon, plan Free, 1 instance. Cùng repo/main, context `.`, Dockerfile `apps/web/Dockerfile`; autoDeploy yes, trigger commit. HTTP health path rỗng. |
| PostgreSQL | `dpg-dbsmrami0phs73dj58q0-a`, tên brewlite-ass2-db, version 16, Oregon, plan Free, status available; highAvailabilityEnabled false; external IP allow list `0.0.0.0/0`. |
| Deploy API đã đọc | `dep-dbtatunf3r2c73f9fq7g`, status live, commit `fd9211599033519c7e96c60bf8ff26a4b0325b33`. |
| Deploy Web đã đọc | `dep-dbtatunf3r2c73f9fqf0`, status live, cùng commit `fd9211599033519c7e96c60bf8ff26a4b0325b33`. |

Render metadata xác nhận **Git/Dockerfile-backed services**. Không có bằng chứng hai service này pull image `assignment2-*:<SHA>` từ GHCR; đường GHCR chỉ có trong workflow CD của repo.

## 2. Log đối chiếu hạ tầng

| Log / thời điểm UTC | Kết quả liên quan sơ đồ |
| --- | --- |
| API Prisma datasource, gồm lần `2026-11-16T07:22:30.598772665Z` | Hostname `dpg-dbsmrami0phs73dj58q0-a`, dạng internal hostname của đúng PostgreSQL đã cung cấp. Không lưu connection string/user/password. |
| Next.js startup, gồm lần `2026-11-16T07:22:28.139730379Z` | `localhost:10000`. |
| Render phát hiện cổng Web, `2026-11-16T07:27:32.506812776Z` | Port 10000, resource Web. |
| Render phát hiện cổng API, `2026-11-16T07:27:45.917623975Z` | Port 10000, resource API. |

Đây là bằng chứng port runtime, không dùng cổng fallback của Dockerfile/source để giả định cổng production. Log datasource chứng minh đường internal host; không suy ra SSL mode nội bộ hay mật khẩu từ log.

## 3. HTTP checks ngày 16/11/2026

| Request | Kết quả | Giới hạn |
| --- | --- | --- |
| API `GET /api/health` | HTTP 200; `status=ok`, `service=brewlite-api`. Timestamp phản hồi `2026-11-16T07:21:26.302Z` (14:21 giờ Việt Nam). | Liveness; không kiểm tra DB. |
| API `GET /api/products` | HTTP 200, JSON array có 4 sản phẩm. | Đường đọc catalog; không thay E2E checkout. |
| Web `GET /menu` và `GET /` | HTTP 200, HTML có BrewLite và bundle `/_next/`. | Web origin đang phục vụ Next.js. |
| API `GET /api/orders/me` không JWT | HTTP 401. | Route từ chối truy cập khi chưa xác thực. |
| API `OPTIONS /api/orders`, Origin là Web production | HTTP 204; allow-origin đúng `https://assignment2-web.onrender.com`. | Không gửi request tạo đơn. |

## 4. Phát hiện và cách đưa vào sơ đồ

- Giữ luồng thực tế: GitHub main → Render Docker build → Web/API; Docker Hub cấp base images theo Dockerfile.
- Không vẽ GHCR pull/paid pre-deploy như luồng live hiện tại.
- Ghi đúng runtime port 10000, HTTPS 443 và DB 5432.
- PostgreSQL có đường nội bộ **và external access được cho phép**. ACL mọi IPv4 vẫn đòi hỏi credential hợp lệ, không có nghĩa truy cập vô danh. Không gọi DB là private-only.
- Không đưa secret, API key, password, connection URL có credential, IP nội bộ của client hoặc dữ liệu khách hàng vào bộ tài liệu.

Tài liệu tham chiếu nền tảng đã đọc: [PostgreSQL — tạo và kết nối](https://render.com/docs/postgresql-creating-connecting), [deploy lifecycle](https://render.com/docs/deploys), [health checks](https://render.com/docs/health-checks).
