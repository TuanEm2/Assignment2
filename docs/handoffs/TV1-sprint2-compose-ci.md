# TV1 — Sprint 2 / Push 1: Docker Compose + CI

## Phạm vi
- Đồng bộ fast-forward TV6 (ec2e541) vào feature/tv1-devops; giữ nguyên main.
- Compose V2: PostgreSQL 16, NestJS API, Next.js web.
- Dockerfile cho cả hai workspace (Node 26).
- API chờ PostgreSQL healthy, tự chạy prisma migrate deploy trước khi khởi động.
- Web chờ API /api/health sẵn sàng.
- CI kiểm tra Docker Compose syntax kèm lint, test và build vốn có.

## Chạy nhanh
1. Copy .env.example -> .env và điền POSTGRES_PASSWORD + JWT_SECRET.
2. docker compose config --quiet
3. docker compose up --build -d
4. docker compose ps
5. curl http://localhost:4000/api/health
6. Mở http://localhost:3000

## Giới hạn và việc nghiệm thu
- Đây là cấu hình stack local/demo; chưa phải CD production. Chưa có TLS/reverse proxy, backup hay rollback release.
- DB volume bền vững; docker compose down -v xóa toàn bộ dữ liệu.
- API health là liveness, không xác nhận DB đã kết nối ở thời điểm request.
- Chưa xác nhận Docker chạy thực tế ở máy local của TV1. Cần chụp log compose ps/health và run Actions xanh.
- Push 2 TV1: Mock Payment Backend + idempotency + Jest, rồi CD/deploy/smoke/rollback và release.
