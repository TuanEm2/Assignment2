# Task 3.2 — Bằng chứng đối chiếu production

Ngày kiểm tra: 16/11/2026. Phạm vi: đọc tài liệu/source, gọi HTTP GET công khai; không tạo/sửa tài nguyên, không đặt đơn hoặc giao dịch thanh toán.

## 1. Định danh môi trường được chủ dự án cung cấp

| Thành phần | Định danh | Nguồn bằng chứng |
| --- | --- | --- |
| Nền tảng / workspace | Render, **My Workspace** | Chủ dự án xác nhận; không phải `Em's workspace` của kết nối Render hiện có. |
| API production | <https://assignment2-19nq.onrender.com> | Chủ dự án cung cấp, đã kiểm tra HTTP. |
| Web production | <https://assignment2-web.onrender.com> | Chủ dự án cung cấp, đã kiểm tra HTTP. |
| PostgreSQL | `dpg-dbsmrami0phs73dj58q0-a` | Chủ dự án cung cấp; không chứa connection string hoặc mật khẩu. |

Kết nối Render hiện có chỉ liệt kê workspace khác, nên không dùng metadata của workspace đó làm bằng chứng cho Assignment 2. Không suy ra region, compute plan, backup policy hoặc image tag từ tên/domain.

## 2. Kiểm tra HTTP công khai

| Request | Kết quả ngày 16/11/2026 | Ý nghĩa và giới hạn |
| --- | --- | --- |
| `GET https://assignment2-19nq.onrender.com/api/health` | HTTP 200; `status=ok`, `service=brewlite-api` | Khớp contract liveness trong `apps/api/src/app.service.ts`; không kiểm tra DB. Timestamp phản hồi: `2026-11-16T07:21:26.302Z` (14:21 giờ Việt Nam). |
| `GET https://assignment2-19nq.onrender.com/api/products` | HTTP 200; JSON array có 4 sản phẩm | Đường đọc catalog hoạt động. Source tương ứng dùng Prisma/PostgreSQL; HTTP không chứng minh hostname/loại connection URL đang cấu hình. |
| `GET https://assignment2-web.onrender.com/menu` | HTTP 200; HTML có BrewLite và bundle `/_next/` | Next.js frontend đang phục vụ trang menu. |
| `GET https://assignment2-web.onrender.com/` | HTTP 200; HTML có BrewLite và bundle `/_next/` | Public Web origin hoạt động qua HTTPS. |
| `GET https://assignment2-19nq.onrender.com/api/orders/me` không có token | HTTP 401 | API từ chối truy cập lịch sử khi chưa xác thực. |
| `OPTIONS https://assignment2-19nq.onrender.com/api/orders`, Origin là Web production | HTTP 204; `Access-Control-Allow-Origin: https://assignment2-web.onrender.com` | CORS cho phép đúng Web origin đã cung cấp; không gửi request tạo đơn. |

Các request không gửi token hoặc secret. Kết quả này không thay thế E2E checkout, kiểm tra hiệu năng hay kiểm toán cấu hình tài khoản Render.

## 3. Cấu hình còn cần chủ dự án đối chiếu

- Nguồn deploy Web/API: build từ Dockerfile trong GitHub, pull image GHCR hay Node native.
- `DATABASE_URL` của API có dùng Internal Database URL của PostgreSQL ở mục 1 hay không.

Khi hai thông tin này được xác nhận, sơ đồ cần thể hiện đúng đường build/deploy đang dùng; GHCR chỉ được vẽ là luồng phát hành đang hoạt động nếu có bằng chứng tương ứng. Cổng nội bộ dùng `PORT` do môi trường cấp; không gán fallback của source thành cổng live khi chưa biết giá trị thực.
