# BrewLite — Assignment 2: Requirements to Deployment

**BrewLite** là ứng dụng web đặt đồ uống, phát triển theo quy trình từ đặc tả yêu cầu, mô hình hóa UML, thiết kế kiến trúc đến hiện thực, kiểm thử và triển khai. Người dùng có thể xem menu, tùy chọn size/topping, quản lý giỏ hàng, đăng ký/đăng nhập, tạo đơn, thanh toán và xem lịch sử đơn.

**Repository:** [TuanEm2/Assignment2](https://github.com/TuanEm2/Assignment2) · **Nhánh chính:** `main`

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ | Nhiệm vụ |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Zustand, Tailwind CSS | Giao diện và trạng thái phía trình duyệt |
| Backend | NestJS 12, TypeScript | REST API, JWT, nghiệp vụ đơn hàng, tồn kho và thanh toán |
| Database | PostgreSQL 16, Prisma 6 | Lưu sản phẩm, người dùng, đơn, nguyên liệu và thanh toán |
| Môi trường local | Docker Compose | Khởi chạy Web, API và PostgreSQL cùng lúc |
| CI/CD | GitHub Actions, Docker, GHCR, Render | Kiểm thử/build, đóng gói image, triển khai theo cấu hình |
| Kiểm thử | Jest, Vitest, Node test runner | Unit, component, integration, E2E và smoke test |

> Frontend hiện là web responsive theo hướng mobile-first; không mặc định coi chức năng PWA/offline đã hoàn thiện. Hai chế độ thanh toán **Mock** và **PayOS** được cấu hình riêng; Mock không thực hiện thu tiền thật.

## 2. Cấu trúc Monorepo

Dự án dùng **npm workspaces** được khai báo tại `package.json` gốc (`"workspaces": ["apps/*"]`). Web và API là hai workspace, dùng chung một repository, `package-lock.json`, quy trình CI/CD và bộ tài liệu. Cây dưới đây thể hiện **các thư mục chính đang có**, không liệt kê mọi file con.

```text
Assignment2/
├── apps/
│   ├── web/                              # Workspace frontend Next.js
│   │   ├── src/
│   │   │   ├── app/                      # Next.js App Router
│   │   │   │   ├── menu/                 # Trang danh sách sản phẩm
│   │   │   │   ├── products/             # Trang chi tiết sản phẩm
│   │   │   │   ├── cart/                 # Giỏ hàng
│   │   │   │   ├── register/             # Đăng ký
│   │   │   │   ├── login/                # Đăng nhập
│   │   │   │   ├── checkout/             # Tạo đơn và chọn thanh toán
│   │   │   │   ├── payment-result/       # Kết quả thanh toán
│   │   │   │   └── orders/               # Lịch sử và trạng thái đơn
│   │   │   ├── components/               # Component giao diện dùng lại
│   │   │   ├── lib/                      # Hàm tiện ích, gọi API và logic dùng chung
│   │   │   └── stores/                   # Zustand: cart-store, auth-store
│   │   ├── public/                       # Tài nguyên tĩnh
│   │   ├── Dockerfile                    # Build/chạy Web
│   │   └── package.json
│   └── api/                               # Workspace backend NestJS
│       ├── src/
│       │   ├── auth/                     # Đăng ký, đăng nhập, JWT/guard
│       │   ├── products/                 # API danh mục và chi tiết sản phẩm
│       │   ├── orders/                   # Tạo đơn, tính giá, idempotency
│       │   ├── inventory/                # Kiểm tra/giữ nguyên liệu, tránh oversell
│       │   ├── payments/                 # Thanh toán mô phỏng
│       │   ├── payos/                    # PayOS QR khi được bật
│       │   ├── order-history/            # Danh sách, chi tiết, trạng thái đơn
│       │   ├── prisma/                   # Tầng truy cập dữ liệu qua Prisma
│       │   ├── http/                     # Cấu hình API và HTTP
│       │   └── main.ts                   # Điểm khởi chạy NestJS
│       ├── prisma/
│       │   ├── schema.prisma             # Mô hình dữ liệu
│       │   ├── migrations/               # Lịch sử migration SQL
│       │   └── seed.mjs                  # Dữ liệu mẫu
│       ├── test/                          # Kiểm thử API/E2E
│       ├── Dockerfile                    # Build/chạy API + migration khi cấu hình
│       └── package.json
├── docs/
│   ├── requirements/                     # Task 1: yêu cầu và use case
│   ├── diagrams/                         # Task 2/3: sơ đồ UML, deployment
│   ├── architecture/                     # Task 3: kiến trúc, ADR
│   ├── traceability-matrix.md            # Truy vết yêu cầu → thiết kế → code → test
│   └── README.md                         # Chỉ dẫn tài liệu
├── tests/
│   ├── cart-calculations.test.mjs         # Kiểm thử logic giỏ hàng
│   ├── integration/                      # Kiểm thử hợp đồng/luồng tích hợp
│   ├── e2e/                              # Kịch bản luồng trình duyệt
│   ├── payos/                            # Kiểm thử an toàn/tích hợp PayOS
│   ├── cd/                               # Kiểm thử tiện ích CD
│   └── smoke/                            # Kiểm tra nhanh môi trường
├── scripts/
│   └── cd/                               # Các script hỗ trợ Render/deploy
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Continuous Integration
│       └── cd.yml                        # Continuous Delivery/Deployment
├── compose.yaml                          # Web + API + PostgreSQL trên máy local
├── .env.example                          # Biến môi trường mẫu (không có secret thật)
├── .gitignore
├── .dockerignore
├── package.json                          # npm workspaces và scripts dùng chung
├── package-lock.json                     # Khóa phiên bản thư viện
└── README.md
```

**Cách tổ chức:** `apps/web` hiển thị dữ liệu và gửi HTTP request; `apps/api` xử lý xác thực, nghiệp vụ, kiểm tra và lưu vào PostgreSQL. Web **không kết nối thẳng database**. `docs/`, `tests/` và workflow được đặt ở gốc để dùng chung cho cả nhóm.

## 3. Luồng hoạt động chính

```text
Người dùng (trình duyệt)
       |
       v
Next.js Web (localhost:3000)
       |  HTTP/JSON + Bearer JWT khi cần xác thực
       v
NestJS API (localhost:4000/api)
       |  Auth / Products / Orders / Inventory / Payments
       v
Prisma ORM
       |
       v
PostgreSQL (localhost:5433 từ máy; 5432 trong Docker)
```

Luồng đặt hàng tối thiểu: **Menu → Chi tiết & tùy chọn → Giỏ hàng → Đăng nhập (nếu cần) → Đặt đơn → Thanh toán → Xác nhận/Lịch sử**. Giá cuối cùng, quyền sở hữu đơn, tồn nguyên liệu và trạng thái thanh toán được backend kiểm tra; giá hiển thị trên client chỉ mang tính tạm tính.

## 4. Chạy toàn bộ hệ thống bằng Docker Compose (khuyến nghị)

### Yêu cầu

- Git, Docker Desktop đang hoạt động và Docker Compose V2.
- Cổng mặc định **3000** (Web), **4000** (API), **5433** (PostgreSQL từ máy host) chưa bị ứng dụng khác sử dụng.

### Bước 1 — Lấy source

```powershell
git clone https://github.com/TuanEm2/Assignment2.git
cd Assignment2
```

Nếu đã có repository trên máy, hãy lưu các thay đổi local cần thiết rồi `git switch main` và `git pull origin main`.

### Bước 2 — Tạo `.env`

```powershell
Copy-Item .env.example .env
```

Mở `.env` và cấu hình tối thiểu:

```dotenv
POSTGRES_USER=brewlite
POSTGRES_PASSWORD=<mat_khau_manh_khong_chua_ky_tu_can_URL_encode>
POSTGRES_DB=brewlite
JWT_SECRET=<chuoi_bao_mat_ngau_nhien_toi_thieu_32_byte>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MENU_DATA_SOURCE=api
NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=true
NEXT_PUBLIC_PAYOS_ENABLED=false
PAYMENT_MODE=mock
```

Đây là **ví dụ cấu trúc**: phải thay các giá trị trong dấu `<...>` bằng giá trị thực trước khi chạy. Có thể tạo `JWT_SECRET` bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Giữ `DATABASE_URL` ở dạng kết nối host nếu cần chạy lệnh Prisma **ngoài Docker**; thay mật khẩu ở URL này tương ứng với `POSTGRES_PASSWORD`. Compose tạo `DATABASE_URL` nội bộ cho container API. **Không commit `.env` hoặc secret lên GitHub.**

### Bước 3 — Build và chạy

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Compose khởi động PostgreSQL trước. Khi DB healthy, API chạy migration (theo cấu hình Dockerfile); Web chờ API healthy rồi mới khởi động. Kiểm tra:

| Dịch vụ | Địa chỉ từ máy của em | Mục đích |
| --- | --- | --- |
| Web | http://localhost:3000 | Giao diện BrewLite; `/` điều hướng tới `/menu` |
| API Health | http://localhost:4000/api/health | Kiểm tra tiến trình backend |
| Product API | http://localhost:4000/api/products | Kiểm tra danh mục từ API |
| PostgreSQL | `127.0.0.1:5433` | Kết nối database từ máy host bằng công cụ quản trị |

**Quan trọng:** Đường dẫn local dùng **`http://`**, không dùng `https://`. Cổng 4000 là REST API, không phải giao diện Web. `GET /api/health` là kiểm tra liveness, **không tự chứng minh toàn bộ DB và nghiệp vụ checkout đều hoạt động**.

### Bước 4 — Xem log và dừng hệ thống

```powershell
docker compose logs --tail=100 api
docker compose logs --tail=100 web
docker compose logs --tail=100 postgres
docker compose down
```

Nếu muốn theo dõi log liên tục dùng `docker compose logs -f api`. Chỉ dùng `docker compose down -v` khi **thật sự muốn xóa volume PostgreSQL và dữ liệu local**.

## 5. Chạy không dùng Docker cho Web và API

Yêu cầu **Node.js 26**, npm và một PostgreSQL 16 đang chạy (có thể dùng riêng service `postgres` của Compose). Tại thư mục gốc:

```powershell
npm ci
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed
```

`db:seed` là bước nạp dữ liệu mẫu, thực hiện khi cần. Trước các lệnh Prisma, đảm bảo `.env` ở gốc có `DATABASE_URL` hợp lệ, ví dụ PostgreSQL chạy từ Compose trên `localhost:5433` với đúng username/password đã cấu hình.

Với frontend chạy `next dev` ngoài Docker, tạo riêng **`apps/web/.env.local`** (chỉ có các biến công khai):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MENU_DATA_SOURCE=api
NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED=true
NEXT_PUBLIC_PAYOS_ENABLED=false
```

Không sao chép `JWT_SECRET`, `DATABASE_URL` hay mật khẩu database vào `apps/web/.env.local`. Sau đó mở **hai terminal** ở thư mục gốc:

```powershell
# Terminal 1 — Backend
npm run dev:api
```

```powershell
# Terminal 2 — Frontend
npm run dev:web
```

Nếu dùng PostgreSQL container thay vì cài local, có thể khởi động riêng database bằng `docker compose up -d postgres` (sau khi đã chuẩn bị `.env`). Không chạy đồng thời bản Web/API Docker và bản Node local trên cùng cổng 3000/4000.

## 6. Các API chính để kiểm tra bằng Postman

**Base URL:** `http://localhost:4000` (prefix API là `/api`). Các API yêu cầu đăng nhập dùng header `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Chức năng | JWT |
| --- | --- | --- | --- |
| GET | `/api/health` | Health check | Không |
| GET | `/api/products` | Danh sách sản phẩm | Không |
| GET | `/api/products/:id` | Chi tiết sản phẩm (ID dạng UUID) | Không |
| GET | `/api/products/:id/availability` | Ước tính khả dụng theo lựa chọn | Không |
| POST | `/api/auth/register` | Đăng ký | Không |
| POST | `/api/auth/login` | Đăng nhập, nhận token | Không |
| GET | `/api/auth/me` | Thông tin người dùng hiện tại | Có |
| POST | `/api/orders` | Tạo đơn, định giá và kiểm tra kho ở backend | Có |
| GET | `/api/orders/me` | Lịch sử đơn cá nhân | Có |
| GET | `/api/orders/:id` | Chi tiết đơn | Có |
| GET | `/api/orders/:id/status` | Trạng thái đơn | Có |
| POST | `/api/payments/mock` | Thanh toán mô phỏng (`PAYMENT_MODE=mock`) | Có |
| GET | `/api/payments/mock/status/:orderId` | Kiểm tra kết quả Mock Payment | Có |
| POST | `/api/payments/payos/checkout` | Tạo checkout QR khi PayOS được bật | Có |
| GET | `/api/payments/payos/status/:orderId` | Trạng thái PayOS khi được bật | Có |

**Lưu ý:** `/api/orders` cần body theo hợp đồng `items`, không gửi giá/tổng tiền tự quyết từ frontend. Với Mock Payment, khóa idempotency đảm bảo gửi lặp cùng yêu cầu không tạo thanh toán lần hai. PayOS là chế độ riêng; **không bật hoặc sử dụng giao dịch thật khi chưa có cấu hình và quyền phù hợp**.

## 7. Các lệnh kiểm thử và build

Chạy ở thư mục gốc (sau `npm ci`):

```powershell
npm run lint                  # Lint các workspace
npm run test                  # Test NestJS + Next.js
npm run test:cart             # Logic giỏ hàng
npm run test:integration      # Contract/integration
npm run test:inventory        # Test InventoryService
npm run test:payos            # Kiểm thử chức năng bảo mật PayOS
npm run test:cd               # Test script hỗ trợ CD
npm run build:api             # Build NestJS
npm run build:web             # Build Next.js
```

Các bài E2E dùng PostgreSQL thật phải có môi trường database và cấu hình thử nghiệm phù hợp, ví dụ:

```powershell
npm run test:inventory:postgres
```

Để smoke test **URL production** từ máy đã có Node, đặt `API_BASE_URL` và `WEB_BASE_URL` trỏ đến đúng dịch vụ HTTPS rồi chạy `npm run test:smoke:live`. Lệnh này kiểm tra health, sản phẩm thực, route lịch sử cần JWT và trang menu; nó **không thay thế một bài kiểm thử thanh toán end-to-end**.

## 8. Quy trình Git và CI/CD (Task 4–5)

### 8.1. CI — `.github/workflows/ci.yml`

CI chạy khi mở PR vào `main`, khi push lên nhánh `feature/**`, khi gọi lại từ workflow khác hoặc khi kích hoạt thủ công.

```text
Checkout source → Setup Node 26 → npm ci
               → Prisma generate/validate
               → Lint → Unit/Contract tests → Validate Compose
               → Build API → Build Web
```

Các job phải đạt thì PR mới nên được merge. Việc **chặn merge tự động** còn phụ thuộc cấu hình branch protection/ruleset của repository, không chỉ vào file YAML.

### 8.2. CD — `.github/workflows/cd.yml`

Workflow CD được định nghĩa để chạy khi push tag bắt đầu bằng `v` hoặc khi chạy thủ công. Có ba chế độ thủ công:

- `publish_only`: build/push image lên GHCR, **không triển khai**.
- `release`: kiểm tra, build/push image rồi triển khai Web/API theo cấu hình Render.
- `rollback`: triển khai lại image theo SHA hợp lệ đã chỉ định; không build lại image.

Luồng của workflow:

```text
Tag v* / Workflow dispatch
           |
           v
Quality gate (gọi lại CI)
           |
           v
Verify operation & commit SHA thuộc main
           |
           v
Build Docker images (trừ rollback)
           |
           v
Push SHA-tagged images lên GHCR
           |
           v
Render: API trước → Web sau
           |
           v
Production smoke test → Deployment summary
```

CD sử dụng các GitHub Actions secrets/variables (chẳng hạn `RENDER_API_KEY`, Render service ID, URL production), **không đặt giá trị bí mật trong repository**. Migration của API có thể chạy ở giai đoạn khởi động theo `RUN_MIGRATIONS_ON_STARTUP=true` trong Dockerfile; rollback image **không tự hoàn tác migration dữ liệu**.

**Phân biệt thiết kế và môi trường đã quan sát:** Tài liệu deployment của nhóm ghi nhận các dịch vụ Render từng build trực tiếp từ GitHub `main` bằng Dockerfile, chứ không phải mặc nhiên pull image từ GHCR. Vì vậy, sự tồn tại của `cd.yml` **không chứng minh** các service production hiện đã cấu hình để nhận GHCR image. Xem [kiến trúc/ADR](docs/architecture/README.md) và [tài liệu đối chiếu deployment](docs/diagrams/task3.2/task3.2-deployment.md) trước khi mô tả hay thay đổi môi trường production.

## 9. Tài liệu và minh chứng Assignment 2

| Task | Nội dung | Vị trí |
| --- | --- | --- |
| Task 1 | Stakeholder, phạm vi, SRS, use case | [`docs/requirements/`](docs/requirements/) |
| Task 2 | Activity, sequence, class diagram | [`docs/diagrams/`](docs/diagrams/) và các thư mục tài liệu liên quan |
| Task 3 | Kiến trúc, ADR, deployment | [`docs/architecture/`](docs/architecture/), [`docs/diagrams/task3.2/`](docs/diagrams/task3.2/) |
| Task 4 | Repository, menu MVP, CI | `apps/`, [CI workflow](.github/workflows/ci.yml) |
| Task 5 | MVP đầy đủ, kiểm thử, CD, bàn giao | `apps/`, `tests/`, [CD workflow](.github/workflows/cd.yml) |
| Truy vết | FR/NFR → UML → mã nguồn → test | [`docs/traceability-matrix.md`](docs/traceability-matrix.md) |

Chi tiết hướng dẫn đọc sơ đồ, nguồn `.puml` và ảnh `.svg` nằm tại [`docs/README.md`](docs/README.md). Mỗi minh chứng phải được hiểu theo **commit SHA, ngày kiểm tra và phạm vi** được ghi trong tài liệu; không suy ra mọi tiêu chí đều đã nghiệm thu chỉ vì có tệp trong repository.

## 10. Phân công module theo vai trò nhóm

| Thành viên | Phạm vi kỹ thuật chính |
| --- | --- |
| TV1 | Nền tảng monorepo, Cart Store, Mock Payment, Docker, CI/CD và phát hành |
| TV2 | Prisma/schema, dữ liệu mẫu, giao diện Cart và Checkout |
| TV3 | Products API, OrdersService, định giá và state machine |
| TV4 | Menu UI, Orders HTTP, tồn kho và xử lý đồng thời |
| TV5 | Product Detail, Auth/JWT backend và History API |
| TV6 | Auth/History UI, tích hợp checkout, integration/E2E, QA và smoke test |

Phân công trên nhằm nêu **module phụ trách**, không thay thế nhật ký commit/PR để xác minh đóng góp thực tế của từng thành viên.

## 11. Lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| `ERR_SSL_PROTOCOL_ERROR` trên localhost | Dùng `http://localhost:3000` và `http://localhost:4000/api/health`, không dùng HTTPS ở local |
| Không mở được trang Web | `docker compose ps` và `docker compose logs --tail=100 web` |
| API không phản hồi | `docker compose logs --tail=100 api`; kiểm tra PostgreSQL healthy và migration |
| API trả 401 | Thêm `Authorization: Bearer <accessToken>` sau khi đăng nhập |
| Frontend hiển thị menu demo thay vì API khi chạy `next dev` | Đặt `NEXT_PUBLIC_MENU_DATA_SOURCE=api` trong `apps/web/.env.local` và khởi động lại Web |
| Lỗi Prisma kết nối DB | Kiểm tra `DATABASE_URL`, password, cổng host `5433` và service PostgreSQL |
| Đổi URL API mà Web vẫn gọi URL cũ | `NEXT_PUBLIC_API_URL` được dùng khi build Web; build lại frontend |
| Không chạy được Docker Compose | Mở Docker Desktop, kiểm tra các cổng 3000/4000/5433, chạy `docker compose config --quiet` |

---

**BrewLite — Assignment 2, môn Công nghệ Phần mềm.** Tài liệu này mô tả cấu trúc và hướng dẫn theo source của repository; cấu hình production và kết quả kiểm thử phải được xác minh tại thời điểm bàn giao.