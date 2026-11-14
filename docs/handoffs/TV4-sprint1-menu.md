# TV4 — Tổng hợp công việc Sprint 1

## 1. Phạm vi

- Phụ trách **Task 4.3: Menu mobile-first và component test**.
- Nhánh làm việc: `feature/tv4-menu-stock`.
- Sử dụng bộ khung và database/seed của TV2.
- Đã merge cập nhật từ nhánh `feature/tv3-products-orders`.
- Tích hợp Menu TV4 với Products API của TV3.

## 2. Chức năng Menu đã triển khai

- Trang `/menu` hiển thị ảnh, tên và giá sản phẩm.
- Giao diện responsive cho điện thoại và máy tính.
- Có các trạng thái:
  - Đang tải dữ liệu.
  - Danh sách sản phẩm trống.
  - Tải dữ liệu thất bại.
  - Hiển thị sản phẩm thành công.
- Nút thử lại khi tải lỗi.
- Hình minh họa dự phòng khi ảnh sản phẩm lỗi.
- Tìm kiếm tên sản phẩm không dấu.
- Hỗ trợ lọc danh mục nếu dữ liệu có danh mục.
- Hỗ trợ hai nguồn dữ liệu: demo và API.
- Khi API lỗi, không tự thay bằng dữ liệu demo.
- Nút chi tiết tạm tắt, chờ trang Product Detail của TV5.

Schema TV2 hiện chưa có trường danh mục và mô tả.
Menu dùng nội dung dự phòng khi thiếu các trường này.

### File giao diện

```text
apps/web/src/app/menu/page.tsx
apps/web/src/app/menu/menu.tsx
apps/web/src/app/menu/menu.css
```

## 3. Database và API

Đã cấu hình PostgreSQL local:

- Database: `brewlite_ass2`.
- Schema: `public`.
- Cổng: `5432`.
- Prisma Client: `6.19.3`.

Đã chạy thành công:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Migration đã áp dụng: `20261111000000_catalog_init`.

Dữ liệu mẫu kế thừa từ TV2:

| Sản phẩm | Giá gốc |
|---|---:|
| Cà phê sữa | 35.000đ |
| Americano | 40.000đ |
| Cappuccino | 45.000đ |
| Trà đào | 39.000đ |

Mỗi món có size S/M/L và topping Trân châu/Kem.

Products API của TV3 đã trả về dữ liệu thật tại:

```text
http://localhost:4000/api/products
```

Đã bổ sung CORS trong `apps/api/src/main.ts` cho:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Menu đã hiển thị được sau khi chuyển sang nguồn API.

## 4. Cấu hình frontend

File cấu hình local: `apps/web/.env.local`.

```env
NEXT_PUBLIC_MENU_DATA_SOURCE=api
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=false
```

Kết nối PostgreSQL dùng `DATABASE_URL` trong `.env` ở gốc dự án.
Không đưa mật khẩu hoặc các file môi trường local vào commit.

## 5. Kiểm thử và kết quả

### File test

```text
apps/web/vitest.config.mts
apps/web/src/app/menu/menu.test.tsx
tests/setup.ts
```

Do `tests/setup.ts` nằm ở gốc repository, cấu hình Vitest dùng:

```ts
setupFiles: ['../../tests/setup.ts'],
```

Đã thêm dòng sau ở đầu `menu.test.tsx` để TypeScript nhận
các matcher khi build:

```ts
import '@testing-library/jest-dom/vitest';
```

### Kết quả đã kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Component/API-data test Menu | 16/16 test đạt |
| Lint frontend | Đạt |
| Build frontend | Đạt, có route `/menu` |
| Mở Products API trực tiếp | Trả về 4 sản phẩm |
| Mở Menu với cấu hình API | Đã hiển thị được |

Test bao phủ loading, empty, error, retry, tìm kiếm, lọc,
ảnh lỗi, hủy request, liên kết chi tiết và validation dữ liệu API.

Test tự động dùng dữ liệu giả lập. Việc mở API và Menu local
là kiểm tra tích hợp thủ công.

### Các lỗi đã xử lý

- Không tìm thấy `./menu`: sửa vị trí/tên file `menu.tsx`.
- Không tìm thấy setup test: sửa đường dẫn trong Vitest.
- Build thiếu kiểu matcher: bổ sung import jest-dom/vitest.
- Chạy trùng frontend: dừng server cũ rồi khởi động lại.
- Bổ sung CORS và cấu hình URL để frontend gọi backend.

## 6. Cách chạy lại

Yêu cầu PostgreSQL đang chạy, database đã migrate và seed.

Mở hai Terminal riêng tại thư mục gốc dự án:

```powershell
# Terminal backend
npm run dev:api
```

```powershell
# Terminal frontend
npm run dev:web
```

Mở:

```text
http://localhost:3000/menu
```

Khởi động lại frontend khi thay đổi `.env.local`.

Các lệnh kiểm tra:

```powershell
npm run test -w apps/web
npm run lint -w apps/web
npm run build:web
```

## 7. Việc còn lại

- Lưu minh chứng request `/api/products` trả HTTP 200
  trong tab Network của trang Menu.
- Kiểm tra Git, commit và push các cập nhật cuối lên nhánh TV4.
- Đối chiếu acceptance criteria khi nhóm chốt SRS.
- Bàn giao phần Menu để nhóm tích hợp và kiểm tra CI.

OrdersController, InventoryService và kiểm thử concurrency
thuộc Sprint 2, chưa thực hiện trong đợt này.

Báo cáo này tổng hợp phần Menu TV4; chưa xác nhận toàn bộ
Sprint 1 của nhóm đã được nghiệm thu hoặc CI GitHub đã đạt.