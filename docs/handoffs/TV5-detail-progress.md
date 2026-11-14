# Tiến độ hiện tại — đợt 2

Auth đợt 1 đã có trong nền chung; History API đợt 2 đã mount và kiểm thử với Orders/Inventory/Payment thật. Xem `TV5-sprint2-push2.md` cho bằng chứng và giới hạn. Giao diện nghiệm thu do TV6 tiếp tục; các mục chưa có schema/Auth/History bên dưới thuộc lịch sử chuẩn bị cũ.

> Cập nhật Sprint 2 đợt 1: đã nhận User/Order schema và Auth đã nối Prisma, mount trong AppModule; xem `TV5-sprint2-push1.md`. Nội dung phía dưới ghi trạng thái lúc chuẩn bị Sprint 1. History vẫn dành cho đợt 2.

# TV5 — Product Detail trên nền catalog/API mới

Nền: `9862594` của TV4, chứa catalog TV2 `c3c35a9` và Product API TV3 `3cf216e`.
Đây là code Assignment 2 viết trong cấu trúc mới, không nhập lịch sử/source Assignment 1.

## File và luồng

- `apps/web/src/lib/products/detail.ts`: parse response, kiểm tra tiền và option, gọi GET `/api/products/:id`. Không lặp `/api` khi URL ENV đã có prefix.
- `apps/web/src/app/products/[id]/page.tsx`: dynamic route với params Promise và Suspense theo Next hiện tại.
- `product-detail.tsx`: loading/error/retry, chọn size/topping, số lượng 1–99, tổng tạm tính, thêm qua store TV1, fallback ảnh.
- `product-detail.css`: bố cục mobile-first/responsive và focus bàn phím.
- `product-detail.test.tsx`: 7 ca kiểm thử; dùng loader/fetch giả lập nhưng Cart Store TV1 thật.

Mapping cart: Product.id → productId, name → productName, price → basePrice; option giữ id/name/price đúng contract TV1–TV3.
Không gửi request tạo đơn hoặc thanh toán ở trang Detail. Không coi số tiền client là giá chính thức.

## Kiểm chứng

- Toàn bộ web: 23/23 tests, 2 files (16 test Menu và 7 test Detail).
- Web ESLint đạt.
- `next typegen` rồi `tsc --noEmit` đạt. Cần sinh route types trước vì layout nền dùng LayoutProps.
- `npm run build:web` đạt, gồm route động `/products/[id]`.
- Chưa chạy với Product API/PostgreSQL thật hoặc nghiệm thu trình duyệt.

## Giới hạn cần phối hợp

- Schema/API catalog chưa có stock/available; không tự bịa dữ liệu tồn kho. Chốt với TV3/TV4 trước khi khóa thêm giỏ theo nguyên liệu.
- Menu TV4 có cờ `NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED`; bật theo bàn giao Menu sau khi route Detail được tích hợp, dùng ID API thật thay vì ID demo.
- Auth, ownership/history API chưa làm vì User/Order schema và hợp đồng Orders chưa có. TV2 quản lý migration; TV3/TV4 sở hữu phần tạo đơn/controller.
- Activity có nguồn `.drawio` và SVG xuất trực tiếp từ draw.io; là bản nháp chờ FR/SRS và UC checkout; chưa tính đã nghiệm thu Task 2.

## Lệnh kiểm tra

```powershell
npm ci
npm run test -w apps/web
npm run lint -w apps/web
npm exec -w apps/web -- next typegen
npm exec -w apps/web -- tsc --noEmit
npm run build:web
```
