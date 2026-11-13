# BrewLite — Assignment 2

Monorepo đặt đồ uống: Next.js 16 (web), NestJS 12 (API), Prisma 6 và PostgreSQL 16.

## Cấu trúc

- apps/web: giao diện Next.js, Cart Store, Checkout, Auth, lịch sử đơn
- apps/api: REST API NestJS, Prisma, Auth, Orders, Products
- docs: sơ đồ, tài liệu API và bàn giao các thành viên
- tests: test tính giỏ hàng và contract tích hợp
- compose.yaml: local stack PostgreSQL + API + Web

## Chạy bằng Docker Compose (TV1)

Yêu cầu: Docker Desktop có Docker Compose V2.

1. Sao chép file ví dụ sang .env (PowerShell: Copy-Item .env.example .env).
2. Đặt POSTGRES_PASSWORD thành mật khẩu mạnh chỉ gồm ký tự URL-safe, và JWT_SECRET thành chuỗi ngẫu nhiên tối thiểu 32 byte. Không commit .env.
3. Chạy: docker compose config --quiet
4. Chạy: docker compose up --build -d
5. Truy cập http://localhost:3000 và kiểm tra http://localhost:4000/api/health.

Để tạo JWT_SECRET ngẫu nhiên: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

API chỉ bắt đầu sau khi PostgreSQL healthy, chạy prisma migrate deploy, rồi khởi động NestJS. Web chờ API health. PostgreSQL có thể truy cập ở localhost:5433 để dùng Prisma từ máy host.

Lệnh hữu ích:
- docker compose ps
- docker compose logs -f api
- docker compose logs -f web
- docker compose down
- docker compose down -v  (**XÓA DỮ LIỆU PostgreSQL**, chỉ dùng khi thật sự muốn reset)

Lưu ý: GET /api/health là liveness check của API, không phải kiểm tra toàn bộ schema/cơ sở dữ liệu. NEXT_PUBLIC_API_URL được đóng vào bản build của web; thay đổi URL cần build lại web. CORS API đang cho phép localhost:3000; nếu triển khai host/domain khác phải cập nhật CORS và biến môi trường. Mật khẩu chứa ký tự đặc biệt phải được URL-encode trong DATABASE_URL, hoặc chọn mật khẩu URL-safe.

## Chạy không cần Docker

Yêu cầu: Node 26, PostgreSQL, npm.

- npm ci
- npm run db:generate
- npm run db:validate
- npm run db:migrate
- npm run db:seed (tùy chọn, dùng dữ liệu demo)
- npm run dev:api
- npm run dev:web (terminal khác)

Khi chạy từ host (không phải trong Docker), dùng DATABASE_URL kết nối localhost:5433 nếu PostgreSQL chạy bằng Compose.

## Quality gate

- npm run lint
- npm run test
- npm run test:cart
- npm run test:integration
- npm run build:api
- npm run build:web

CI: .github/workflows/ci.yml, chạy trên feature/** và PR vào main. Không merge khi CI đỏ. E2E PostgreSQL và smoke với stack thật cần thực hiện bổ sung trước khi phát hành.

## Trách nhiệm nhóm

TV1: Git/monorepo, Docker Compose, CI/CD, Mock Payment và release.
TV2: Prisma schema, Cart/Checkout.
TV3: Orders và state machine.
TV4: Menu, stock/ingredient concurrency.
TV5: Authentication/JWT, chi tiết sản phẩm.
TV6: frontend integration, order history, QA/E2E.

Xem docs/handoffs/ để đọc tiến độ chi tiết và contracts.
