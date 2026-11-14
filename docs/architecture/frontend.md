# BrewLite — Kiến trúc Frontend

| Thông tin | Nội dung |
| --- | --- |
| Hạng mục | Task 3.1 — Frontend Architecture |
| Người tổng hợp | Huy — TV4 |
| Phạm vi | Công nghệ, hệ thống trang, quản lý trạng thái, REST API, responsive, PWA và tổ chức kiểm thử frontend |
| Căn cứ | Mã nguồn BrewLite Assignment 2 được cung cấp |
| Phối hợp | Các thành viên sở hữu module frontend cung cấp thông tin; TV1 tổng hợp kiến trúc toàn hệ thống |

## 1. Tổng quan

Frontend BrewLite sử dụng Next.js App Router, React, TypeScript và

Zustand để xây dựng luồng đặt đồ uống.

Các màn hình chính gồm Menu, Product Detail, Cart, Register, Login,

Checkout, Order History và Order Detail.

Frontend tiếp nhận thao tác, quản lý trạng thái giao diện và hiển thị

kết quả. Backend NestJS chịu trách nhiệm xác thực, kiểm tra quyền,

tính giá cuối cùng, tạo đơn, giữ nguyên liệu và xử lý thanh toán mô phỏng.

Luồng giao tiếp chính:

```text

Trình duyệt

&#x20;   → Giao diện Next.js

&#x20;   → REST API NestJS

&#x20;   → Prisma

&#x20;   → PostgreSQL

```

Các request nghiệp vụ hiện được gửi trực tiếp từ trình duyệt tới NestJS.

Frontend không kết nối trực tiếp database.

## 2. Công nghệ sử dụng

| Công nghệ | Vai trò |
| --- | --- |
| Next.js App Router | Tổ chức route, layout và điều hướng |
| React | Xây dựng component và xử lý tương tác |
| TypeScript | Mô tả kiểu dữ liệu, props và hợp đồng giữa các phần |
| Zustand | Quản lý giỏ hàng và trạng thái xác thực dùng chung |
| Zustand persist | Lưu các trạng thái được chọn vào localStorage |
| Fetch API | Giao tiếp HTTP với backend |
| Tailwind CSS và CSS riêng | Xây dựng bố cục, responsive và giao diện từng màn hình |
| Vitest và React Testing Library | Kiểm thử component, hook và logic frontend |

Các component tương tác như Menu, ProductDetail, CartView, LoginForm,

RegisterForm và CheckoutScreen sử dụng Client Component.

Các file `page.tsx` đóng vai trò điểm vào route và kết nối component

màn hình. Route chi tiết sản phẩm sử dụng route động, `params` và

`Suspense` để mở trang.

## 3. Tổ chức mã nguồn

| Vị trí | Trách nhiệm |
| --- | --- |
| `apps/web/src/app/` | Route, layout, component màn hình và CSS tương ứng |
| `apps/web/src/stores/` | Store giỏ hàng và xác thực |
| `apps/web/src/lib/cart/` | Kiểu dữ liệu, chuẩn hóa dòng và tính toán giỏ hàng |
| `apps/web/src/lib/products/` | Chuẩn hóa URL, tải và kiểm tra dữ liệu sản phẩm |
| `apps/web/src/lib/checkout/` | Điều phối tạo đơn, thanh toán và kiểm tra kết quả |
| `apps/web/src/lib/client-ready.ts` | Xác định thời điểm phía client sẵn sàng |
| `apps/web/public/images/products/` | Ảnh sản phẩm |

Logic tính toán giỏ hàng được tách khỏi component trong

`lib/cart/calculations.ts`.

Logic điều phối checkout được tách vào

`lib/checkout/use-checkout-orchestrator.ts`.

## 4. Hệ thống trang

| Route | Chức năng |
| --- | --- |
| `/` | Chuyển hướng tới `/menu` |
| `/menu` | Xem và tìm kiếm đồ uống |
| `/products/\[id]` | Xem sản phẩm, chọn size, topping và số lượng |
| `/cart` | Xem, cập nhật và xóa món trong giỏ |
| `/register` | Đăng ký tài khoản |
| `/login` | Đăng nhập và điều hướng sau đăng nhập |
| `/checkout` | Kiểm tra giỏ, xác thực và thanh toán mô phỏng |
| `/orders` | Xem lịch sử đơn hàng cá nhân |
| `/orders/\[id]` | Xem chi tiết và trạng thái đơn |

Việc hiển thị màn hình theo trạng thái xác thực phục vụ trải nghiệm

người dùng. Backend vẫn kiểm tra JWT và quyền sở hữu đơn trước khi

trả dữ liệu hoặc xử lý nghiệp vụ.

## 5. Quản lý trạng thái

### 5.1. Trạng thái cục bộ

React `useState` được dùng cho dữ liệu chỉ liên quan một màn hình.

| Màn hình | Trạng thái chính |
| --- | --- |
| Menu | Sản phẩm, loading, error, từ khóa, bộ lọc và lần thử lại |
| Product Detail | Sản phẩm, size, topping, số lượng, thông báo và ước tính tồn |
| Login/Register | Dữ liệu nhập, loading và lỗi |
| Checkout | Giai đoạn xử lý và kết quả thanh toán |
| History/Order Detail | Dữ liệu đơn, lỗi và lần thử lại; lịch sử có cursor tải thêm |

Các luồng tải dữ liệu có sử dụng `AbortController` để hủy hoặc bỏ qua

phản hồi không còn phù hợp khi rời trang hoặc thay đổi lựa chọn.

### 5.2. Giỏ hàng dùng chung

File: `apps/web/src/stores/cart-store.ts`.

| Thành phần | Mô tả |
| --- | --- |
| `items` | Danh sách dòng giỏ hàng |
| `addItem` | Thêm món hoặc cộng số lượng vào dòng cùng lựa chọn |
| `setQuantity` | Thay đổi số lượng; giá trị 0 được store xử lý như xóa dòng |
| `removeItem` | Xóa một dòng |
| `clearCart` | Xóa toàn bộ giỏ |
| Khóa lưu trữ | `brewlite-cart-v1` trong localStorage |

Dòng giỏ hàng được định danh theo `productId`, `sizeId` và tập

`toppingIds` đã chuẩn hóa. Đổi thứ tự chọn topping không tạo dòng mới

cho cùng một lựa chọn.

Các hàm chuẩn hóa và tính giá nằm trong

`apps/web/src/lib/cart/calculations.ts`.

Giá frontend chỉ dùng để hiển thị tạm tính. Backend đọc lại catalog

và quyết định giá khi tạo đơn.

### 5.3. Trạng thái xác thực

File: `apps/web/src/stores/auth-store.ts`.

| Thành phần | Mô tả |
| --- | --- |
| Dữ liệu | `token`, `user`, `isAuthenticated` |
| Thao tác | `setAuth`, `logout` |
| Khóa lưu trữ | `brewlite-auth-v1` trong localStorage |
| Header xác thực | `Authorization: Bearer <token>` |

Backend kiểm tra chữ ký, thời hạn token và người dùng tương ứng.

`isAuthenticated` phía client không thay thế kiểm tra backend.

Bản hiện tại chưa có refresh token hoặc interceptor xử lý phiên hết hạn

thống nhất cho toàn bộ request.

Store có hàm `logout`; chưa thấy nút đăng xuất được nối trong các

màn hình hiện có.

### 5.4. Khôi phục dữ liệu phía client

Cart, Checkout và các màn hình lịch sử sử dụng `useClientReady` để

phân biệt giai đoạn render phía server và phía client.

Cơ chế này hỗ trợ hiển thị dữ liệu phụ thuộc localStorage trong Next.js.

## 6. Giao tiếp REST API

Biến `NEXT\_PUBLIC\_API\_URL` xác định URL API công khai mà trình duyệt

có thể truy cập.

Helper `apps/web/src/lib/products/url.ts` chuẩn hóa URL sản phẩm,

hỗ trợ cấu hình có hoặc chưa có hậu tố `/api`.

Auth, Checkout và History hiện cũng có xử lý URL tại module của mình.

Chưa có API client chung cho toàn bộ frontend.

| Endpoint | Mục đích |
| --- | --- |
| `GET /api/products` | Danh sách đồ uống |
| `GET /api/products/:id` | Chi tiết và tùy chọn sản phẩm |
| `GET /api/products/:id/availability` | Ước tính số ly theo size và topping |
| `POST /api/auth/register` | Đăng ký |
| `POST /api/auth/login` | Đăng nhập |
| `POST /api/orders` | Tạo đơn và giữ nguyên liệu |
| `POST /api/payments/mock` | Thanh toán mô phỏng |
| `GET /api/payments/mock/status/:orderId` | Kiểm tra kết quả thanh toán |
| `GET /api/orders/me` | Lịch sử đơn cá nhân |
| `GET /api/orders/:id` | Chi tiết đơn cá nhân |
| `GET /api/orders/:id/status` | Trạng thái đơn cá nhân |

Helper sản phẩm kiểm tra dữ liệu phản hồi trước khi đưa vào giao diện.

Không phải mọi module đều có cơ chế kiểm tra response chung.

## 7. Luồng Menu → Giỏ hàng → Checkout

| Bước | Thành phần | Xử lý |
| --- | --- | --- |
| 1 | Menu | Đọc danh sách từ API khi được cấu hình nguồn `api` |
| 2 | ProductDetail | Tiếp nhận lựa chọn size, topping và số lượng |
| 3 | Cart store | Lưu lựa chọn vào giỏ |
| 4 | CartView | Hiển thị giỏ và cập nhật tạm tính |
| 5 | CheckoutScreen | Kiểm tra giỏ và trạng thái đăng nhập |
| 6 | Checkout orchestrator | Chuyển dòng giỏ thành payload chỉ gồm ID và số lượng |
| 7 | Frontend | Gửi tạo đơn cùng Bearer token và Idempotency-Key |
| 8 | Backend | Tính lại giá, tạo đơn và giữ nguyên liệu trong transaction |
| 9 | Checkout orchestrator | Gọi thanh toán mô phỏng bằng mã đơn vừa nhận |
| 10 | CheckoutView và store | Hiển thị kết quả, xóa giỏ sau khi xác nhận thành công |

### 7.1. Phân chia trách nhiệm

| Thành phần | Trách nhiệm |
| --- | --- |
| `CheckoutScreen` | Kết nối store, dữ liệu và thao tác với giao diện |
| `CheckoutView` | Trình bày thông tin và trạng thái checkout |
| `useCheckoutOrchestrator` | Điều phối tạo đơn, thanh toán và kiểm tra kết quả |

### 7.2. Trạng thái checkout

| Giai đoạn | Ý nghĩa |
| --- | --- |
| `review` | Xem lại thông tin trước khi gửi |
| `processing` | Đang xử lý |
| `failed` | Thao tác thất bại; giữ giỏ để xử lý tiếp |
| `unknown` | Chưa rõ kết quả thanh toán; cần kiểm tra backend |
| `paid` | Đã xác nhận thanh toán thành công |

Trong cùng phiên checkout, khi giỏ không thay đổi, thử lại sau một lần

thanh toán thất bại đã xác nhận sẽ giữ khóa tạo đơn và tạo khóa thanh

toán mới.

Khi kết quả chưa rõ, giao diện chuyển sang `unknown`, chặn gửi thanh

toán tiếp trong trạng thái đó và cho phép kiểm tra kết quả từ backend.

Giỏ chỉ được xóa khi backend xác nhận thanh toán thành công.

Khóa checkout được giữ bằng `useRef`, chưa persist qua tải lại trang.

## 8. Hiển thị tồn nguyên liệu

| Nội dung | Cách thực hiện |
| --- | --- |
| Menu | Có thể nhận `availableCups` cho size S không topping |
| Product Detail | Đọc ước tính theo size và topping đang chọn |
| Công thức | Lấy giá trị nhỏ nhất của `floor(tồn / nhu cầu cho một ly)` trên các nguyên liệu liên quan |
| Giới hạn số lượng | Khi có ước tính hợp lệ, chặn thêm số lượng vượt ước tính |
| Không đọc được ước tính | Thông báo rằng hệ thống sẽ kiểm tra lại khi đặt đơn |

Ước tính là snapshot tại thời điểm đọc. Tồn có thể thay đổi do khách

khác đặt đồng thời.

`InventoryService` backend chịu trách nhiệm kiểm tra và giữ nguyên liệu

thực tế trong transaction tạo đơn.

## 9. Responsive và khả năng sử dụng

| Hạng mục | Cách triển khai |
| --- | --- |
| Menu màn hình rộng | CSS Grid ba cột |
| Menu từ breakpoint 850px trở xuống | Hai cột |
| Menu từ breakpoint 600px trở xuống | Một cột và điều chỉnh bố cục |
| Product Detail | Chuyển về một cột trên màn hình nhỏ |
| Cart và Checkout | Sử dụng các lớp responsive của Tailwind |
| Trường nhập | Có label |
| Thông báo | Sử dụng `role=status`, `role=alert`, `aria-live` tại các vị trí tương ứng |
| Điều hướng bàn phím | Có focus-visible; Menu có liên kết bỏ qua tới danh sách món |
| Giảm chuyển động | Menu hỗ trợ `prefers-reduced-motion` |

Cần kiểm tra trên trình duyệt và viewport thực tế. Component test

chưa đủ chứng minh toàn bộ responsive hoặc khả năng tiếp cận đã đạt.

## 10. Cấu hình frontend

| Biến | Ý nghĩa |
| --- | --- |
| `NEXT\_PUBLIC\_API\_URL` | URL API mà trình duyệt truy cập |
| `NEXT\_PUBLIC\_MENU\_DATA\_SOURCE` | Nguồn Menu: `demo` hoặc `api` |
| `NEXT\_PUBLIC\_PRODUCT\_DETAIL\_ENABLED` | Bật liên kết từ Menu tới Detail |
| `NEXT\_PUBLIC\_MOCK\_PAYMENT\_TEST\_CONTROLS` | Hiển thị lựa chọn kết quả mô phỏng để kiểm thử |

Ví dụ cấu hình local để kiểm tra luồng sản phẩm thật:

```env

NEXT\_PUBLIC\_API\_URL=http://localhost:4000/api

NEXT\_PUBLIC\_MENU\_DATA\_SOURCE=api

NEXT\_PUBLIC\_PRODUCT\_DETAIL\_ENABLED=true

NEXT\_PUBLIC\_MOCK\_PAYMENT\_TEST\_CONTROLS=false

```

Trong code Menu, nguồn mặc định là `demo` nếu không cấu hình.

Docker Compose và workflow CD hiện truyền nguồn `api` khi build.

`NEXT\_PUBLIC\_\*` là cấu hình công khai phía frontend, không dùng để lưu

mật khẩu database hoặc JWT secret.

Với production, các giá trị này được đóng vào build; thay đổi cấu hình

cần build lại web.

API cần có URL mà trình duyệt truy cập được và cấu hình CORS phù hợp

với domain frontend.

## 11. Mức triển khai PWA

| Hạng mục | Hiện trạng |
| --- | --- |
| Responsive | Có cơ chế bố cục trong source |
| Web app manifest | Chưa thấy triển khai |
| Service worker | Chưa thấy triển khai |
| Offline | Chưa có cơ chế |

Có thể mô tả BrewLite là ứng dụng web responsive hỗ trợ sử dụng trên

điện thoại. Chưa đủ cơ sở khẳng định đã triển khai PWA đầy đủ, cài đặt

ứng dụng hoặc đặt hàng offline.

## 12. Tổ chức kiểm thử frontend

| Hạng mục | Kiểm thử liên quan | Mục đích |
| --- | --- | --- |
| Menu | `apps/web/src/app/menu/menu.test.tsx` | Loading, dữ liệu, rỗng, lỗi, retry, tìm kiếm và điều kiện mở chi tiết |
| URL sản phẩm | `apps/web/src/lib/products/url.test.ts` | Chuẩn hóa URL và mã hóa ID |
| Product Detail | `apps/web/src/app/products/\[id]/product-detail.test.tsx` | Hành vi màn hình chi tiết và lựa chọn sản phẩm |
| Tính giỏ hàng | `tests/cart-calculations.test.mjs` | Giá, thành tiền, số lượng và chuẩn hóa lựa chọn |
| Cart UI | `apps/web/src/app/cart/cart-view.test.tsx` | Hiển thị và thao tác giỏ |
| Checkout UI | `apps/web/src/app/checkout/checkout-view.test.tsx` | Hiển thị và thao tác theo trạng thái checkout |
| Checkout orchestrator | `apps/web/src/lib/checkout/checkout-orchestrator.test.ts` | Thành công, thất bại, retry và kết quả chưa rõ |

Menu cho phép truyền hàm tải dữ liệu qua props, giúp tạo các tình huống

kiểm thử mà không phụ thuộc API đang chạy.

Component và hook test cần được bổ sung bằng kiểm tra trình duyệt,

responsive và luồng frontend–API–database thật.

Một số test trong `tests/integration/` hiện sử dụng dữ liệu và hàm

mô phỏng. Tên test có chữ E2E không tự chứng minh đã kiểm thử hành trình

qua toàn bộ hệ thống thật.

Phần này mô tả cách tổ chức kiểm thử phục vụ thiết kế kiến trúc.

Kết quả chạy, log và bằng chứng nghiệm thu được bàn giao ở Task 4–5;

tài liệu này không xác nhận toàn bộ test đã đạt.

## 13. Lý do lựa chọn và giới hạn kiến trúc

| Quyết định | Lợi ích | Giới hạn hoặc điểm cần ghi nhận |
| --- | --- | --- |
| Next.js App Router | Tổ chức màn hình theo route, hỗ trợ mở rộng | Các màn hình tương tác vẫn cần xử lý trạng thái và tải dữ liệu phù hợp |
| Zustand | Chia sẻ giỏ và phiên giữa các màn hình | Trạng thái client không quyết định quyền hoặc giá cuối |
| Persist localStorage | Giữ giỏ sau tải lại trang | Dữ liệu có thể bị sửa; backend phải kiểm tra lại |
| REST API riêng | Phân chia giao diện và nghiệp vụ | Cần thống nhất contract, URL và CORS |
| Tách hook checkout | Tập trung thứ tự tạo đơn và thanh toán | Khóa xử lý chưa khôi phục qua tải lại trang |
| API helper theo module | Phục vụ các module hiện tại | URL và xử lý lỗi còn phân tán |
| Token trong localStorage | Phù hợp auth store đang triển khai | Chưa dùng cookie HttpOnly; cần ghi nhận khi đánh giá bảo mật |

Có thể thống nhất API client và cách xử lý lỗi ở giai đoạn tiếp theo.

Các quyết định kiến trúc chung và ADR toàn hệ thống do TV1 tổng hợp.
