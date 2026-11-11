# Products API Sprint 1

Contract tạm cho TV3 và nhóm frontend, dựa trên đề bài và [bàn giao dữ liệu TV2](../handoffs/TV2-sprint1-catalog.md). Cập nhật liên kết FR/NFR khi SRS được chốt.

| Route công khai | Kết quả |
| --- | --- |
| `GET /api/products` | `200` và mảng sản phẩm, sắp theo `slug` tăng dần. Catalog trống trả `[]`. |
| `GET /api/products/:id` | `200` và một sản phẩm kèm `sizes`, `toppings`. `:id` là UUID, không phải `slug`. |
| `GET /api/products/:id` với ID sai định dạng | `400`, lỗi validation của NestJS. |
| `GET /api/products/:id` với UUID không có trong catalog | `404`, thông báo `Product not found`. |

API đọc trực tiếp từ PostgreSQL. Danh sách hiện không có phân trang hoặc bộ lọc. Giá là số nguyên VND: `price` của sản phẩm là giá gốc, `price` của option là phụ thu. `imageUrl` là đường dẫn trên ứng dụng web. `sizes` theo thứ tự S, M, L; `toppings` theo tên. Sản phẩm không có option trả mảng rỗng tương ứng.

Ví dụ phần tử trong danh sách (ID minh họa; dùng ID do API trả về khi gọi chi tiết):

```json
{
  "id": "07442aa4-135f-4e17-b3f2-d935984b5633",
  "slug": "americano",
  "name": "Americano",
  "price": 40000,
  "imageUrl": "/images/products/americano.jpg"
}
```

Phản hồi chi tiết giữ các trường trên và thêm hai mảng. Mỗi option có `id`, `name`, `price`:

```json
{
  "id": "07442aa4-135f-4e17-b3f2-d935984b5633",
  "slug": "americano",
  "name": "Americano",
  "price": 40000,
  "imageUrl": "/images/products/americano.jpg",
  "sizes": [
    { "id": "be72cb31-ea09-40ea-b37a-039b4f8081f5", "name": "M", "price": 5000 }
  ],
  "toppings": [
    { "id": "32bfcc03-659a-4aa3-9300-861664b5fc7e", "name": "Kem", "price": 10000 }
  ]
}
```

## Chạy local bằng Docker

Từ thư mục gốc, khi Docker đang chạy, tạo container PostgreSQL riêng cho Sprint 1:

```powershell
docker run --name brewlite-sprint1-db --env POSTGRES_USER=brewlite --env POSTGRES_PASSWORD=brewlite_local --env POSTGRES_DB=brewlite --publish 127.0.0.1:55432:5432 --detach postgres:16-alpine
docker exec brewlite-sprint1-db pg_isready -U brewlite -d brewlite
```

Chờ PostgreSQL báo sẵn sàng. Trong terminal chạy API, đặt biến môi trường sau; cũng có thể đặt cùng giá trị trong tệp `.env` ở thư mục gốc. Đây là mật khẩu dùng riêng cho database local trong ví dụ.

```powershell
$env:DATABASE_URL = 'postgresql://brewlite:brewlite_local@127.0.0.1:55432/brewlite?schema=public'
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
```

API mặc định dùng cổng 4000. Nếu cổng này đang bận, đặt `$env:PORT = 4001` trước khi chạy `npm run dev:api` và thay cổng trong các URL bên dưới.

Thử trong terminal khác:

```powershell
$products = Invoke-RestMethod 'http://localhost:4000/api/products'
$products
Invoke-RestMethod "http://localhost:4000/api/products/$($products[0].id)"
```

## Kiểm thử

Chạy `npm run db:generate` sau khi cài dependency để Prisma Client có kiểu đúng theo schema. Các test tự động thay lớp kết nối dữ liệu bằng fixture để chạy được cả khi không có PostgreSQL. Dùng các lệnh chạy local ở trên để kiểm tra API với seed thật.

```powershell
npm run test -w apps/api
npm run test:e2e -w apps/api
npm run lint -w apps/api
npm run build:api
```
