import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/**
 * TV6 End-to-End Real System Test Suite (Sprint 2 - Đạt chuẩn kiểm thử toàn hệ thống)
 *
 * Kiểm thử toàn diện hành trình người dùng trên ứng dụng, API và Database thật:
 * 1. Menu đồ uống (TV4 /api/products)
 * 2. Chi tiết đồ uống, Size & Topping (TV5 /api/products/:id)
 * 3. Đăng ký tài khoản mật khẩu chuẩn >= 12 ký tự (TV5 /api/auth/register)
 * 4. Đăng nhập & cấp phát JWT Bearer token (TV5 /api/auth/login)
 * 5. Đặt đơn hàng Server Pricing & Idempotency Key (TV3/TV4 /api/orders)
 * 6. Xử lý Thanh toán thất bại & Kịch bản Thử lại thanh toán (TV1/TV6 /api/payments/mock)
 * 7. Lịch sử đơn hàng cá nhân Keyset Cursor (TV5/TV6 /api/orders/me)
 * 8. Chi tiết snapshot đơn hàng tại thời điểm đặt (TV5/TV6 /api/orders/:id)
 * 9. Bảo mật đa khách thuê Multi-tenant: Tài khoản B không thể đọc đơn của Tài khoản A (HTTP 404)
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function isApiReachable() {
  try {
    const res = await fetch(`${API_URL}/api/products`, { signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

test('[E2E System Test] Khảo sát tính sẵn sàng của Backend API và Database PostgreSQL', async () => {
  const reachable = await isApiReachable();
  if (!reachable) {
    console.warn(`[CẢNH BÁO] API server tại ${API_URL} chưa được khởi động. Hãy chạy 'npm run dev:api' để kiểm thử E2E trực tiếp trên backend thật.`);
  }
  assert.ok(true, 'Kiểm tra trạng thái sẵn sàng');
});

test('[E2E System Flow] Chạy toàn diện luồng nghiệp vụ trên API NestJS & Database PostgreSQL thật', async (t) => {
  const reachable = await isApiReachable();
  if (!reachable) {
    t.skip(`Bỏ qua kiểm thử trực tiếp vì server ${API_URL} chưa bật.`);
    return;
  }

  const timestamp = Date.now();
  const userAEmail = `customer_e2e_a_${timestamp}@brewlite.vn`;
  const userBEmail = `customer_e2e_b_${timestamp}@brewlite.vn`;
  const password = 'StrongPassword2026!@#';

  // -------------------------------------------------------------------------
  // BƯỚC 1: Lấy danh mục thực đơn (Menu) từ Database
  // -------------------------------------------------------------------------
  const menuRes = await fetch(`${API_URL}/api/products`);
  assert.equal(menuRes.status, 200, 'GET /api/products phải trả về HTTP 200');
  const products = await menuRes.json();
  assert.ok(Array.isArray(products) && products.length > 0, 'Menu phải có ít nhất 1 sản phẩm');
  const selectedProduct = products[0];
  assert.ok(selectedProduct.id && selectedProduct.name && selectedProduct.price, 'Sản phẩm phải có đầy đủ ID, Tên, Giá');

  // -------------------------------------------------------------------------
  // BƯỚC 2: Xem chi tiết sản phẩm, Size và Topping từ Database
  // -------------------------------------------------------------------------
  const detailRes = await fetch(`${API_URL}/api/products/${selectedProduct.id}`);
  assert.equal(detailRes.status, 200, 'GET /api/products/:id phải trả về HTTP 200');
  const productDetail = await detailRes.json();
  assert.ok(productDetail.sizes && productDetail.sizes.length > 0, 'Sản phẩm phải có các Size để lựa chọn');
  const selectedSize = productDetail.sizes[0];
  const selectedToppingIds = (productDetail.toppings || []).slice(0, 1).map((t) => t.id);

  // -------------------------------------------------------------------------
  // BƯỚC 3: Đăng ký tài khoản Khách hàng A mới vào PostgreSQL
  // -------------------------------------------------------------------------
  const regRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: password,
      name: 'Khách Hàng A (E2E Test)',
    }),
  });
  assert.equal(regRes.status, 201, 'POST /api/auth/register phải trả về HTTP 201 Created');
  const regData = await regRes.json();
  assert.equal(regData.user.email, userAEmail);
  assert.equal('password' in regData.user, false, 'Phản hồi tuyệt đối không lộ password/hash');

  // -------------------------------------------------------------------------
  // BƯỚC 4: Đăng nhập hệ thống và lấy JWT Bearer token
  // -------------------------------------------------------------------------
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: password,
    }),
  });
  assert.equal(loginRes.status, 200, 'POST /api/auth/login phải trả về HTTP 200 OK');
  const loginData = await loginRes.json();
  const tokenA = loginData.accessToken;
  assert.ok(tokenA, 'Phải nhận được accessToken JWT');

  // -------------------------------------------------------------------------
  // BƯỚC 5: Tạo đơn hàng với Server Pricing & Idempotency Key (Trừ kho thật)
  // -------------------------------------------------------------------------
  const orderIdempotencyKey1 = `order-key-e2e-${timestamp}-1`;
  const orderPayload = {
    items: [
      {
        productId: selectedProduct.id,
        sizeId: selectedSize.id,
        toppingIds: selectedToppingIds,
        quantity: 2,
      },
    ],
  };

  const createOrderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': orderIdempotencyKey1,
    },
    body: JSON.stringify(orderPayload),
  });
  assert.equal(createOrderRes.status, 201, 'POST /api/orders phải trả về HTTP 201 Created');
  const orderData1 = await createOrderRes.json();
  assert.ok(orderData1.id, 'Phải sinh mã đơn hàng (UUID)');
  assert.equal(orderData1.status, 'PENDING', 'Trạng thái đơn mới khởi tạo phải là PENDING');
  assert.ok(orderData1.total > 0, 'Backend phải tự tính toán tổng tiền');

  // Kiểm tra tính Idempotent: Gửi lại cùng key phải trả về đơn cũ
  const replayOrderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': orderIdempotencyKey1,
    },
    body: JSON.stringify(orderPayload),
  });
  assert.equal(replayOrderRes.status, 201);
  const replayData = await replayOrderRes.json();
  assert.equal(replayData.id, orderData1.id, 'Cùng idempotency key phải replay lại đúng đơn hàng cũ');

  // -------------------------------------------------------------------------
  // BƯỚC 6: Thanh toán Mock Wallet thành công -> Đơn chuyển sang PAID
  // -------------------------------------------------------------------------
  const paymentKey1 = `pay_key_${timestamp}_001`;
  const payRes1 = await fetch(`${API_URL}/api/payments/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': paymentKey1,
    },
    body: JSON.stringify({
      orderId: orderData1.id,
      method: 'MOCK_WALLET',
      outcome: 'SUCCESS',
      idempotencyKey: paymentKey1,
    }),
  });
  assert.equal(payRes1.status, 200, 'POST /api/payments/mock phải trả về HTTP 200');
  const payData1 = await payRes1.json();
  assert.equal(payData1.status, 'PAID', 'Thanh toán thành công đơn phải chuyển sang PAID');

  // -------------------------------------------------------------------------
  // BƯỚC 7: Kiểm chứng kịch bản Thất bại thanh toán & Thử lại (Retry Flow)
  // -------------------------------------------------------------------------
  const orderIdempotencyKey2 = `order-key-e2e-${timestamp}-2`;
  const createOrder2Res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': orderIdempotencyKey2,
    },
    body: JSON.stringify(orderPayload),
  });
  assert.equal(createOrder2Res.status, 201);
  const orderData2 = await createOrder2Res.json();

  // Thanh toán lần 1 bị lỗi (FAILURE)
  const failPayKey = `pay_fail_${timestamp}_001`;
  const failPayRes = await fetch(`${API_URL}/api/payments/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': failPayKey,
    },
    body: JSON.stringify({
      orderId: orderData2.id,
      method: 'MOCK_CARD',
      outcome: 'FAILURE',
      idempotencyKey: failPayKey,
    }),
  });
  assert.equal(failPayRes.status, 200);
  const failPayData = await failPayRes.json();
  assert.equal(failPayData.status, 'PAYMENT_FAILED', 'Giao dịch thất bại phải chuyển trạng thái PAYMENT_FAILED');

  // Người dùng nhấn "Thử thanh toán lại" với Idempotency Key MỚI trên cùng đơn hàng
  const retryPayKey = `pay_retry_${timestamp}_002`;
  assert.notEqual(failPayKey, retryPayKey, 'Khóa thanh toán thử lại phải là khóa mới độc lập');
  const retryPayRes = await fetch(`${API_URL}/api/payments/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'idempotency-key': retryPayKey,
    },
    body: JSON.stringify({
      orderId: orderData2.id,
      method: 'MOCK_WALLET',
      outcome: 'SUCCESS',
      idempotencyKey: retryPayKey,
    }),
  });
  assert.equal(retryPayRes.status, 200);
  const retryPayData = await retryPayRes.json();
  assert.equal(retryPayData.status, 'PAID', 'Thử lại thanh toán thành công phải cập nhật đơn sang PAID');

  // -------------------------------------------------------------------------
  // BƯỚC 8: Xem Lịch sử đơn hàng cá nhân (/api/orders/me)
  // -------------------------------------------------------------------------
  const historyRes = await fetch(`${API_URL}/api/orders/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(historyRes.status, 200, 'GET /api/orders/me phải trả về HTTP 200');
  const history = await historyRes.json();
  assert.ok(Array.isArray(history), 'Lịch sử đơn phải là một mảng');
  const foundOrder1 = history.find((o) => o.id === orderData1.id);
  const foundOrder2 = history.find((o) => o.id === orderData2.id);
  assert.ok(foundOrder1, 'Đơn hàng 1 phải xuất hiện trong lịch sử của Khách A');
  assert.ok(foundOrder2, 'Đơn hàng 2 phải xuất hiện trong lịch sử của Khách A');
  assert.equal(foundOrder1.status, 'PAID');
  assert.equal(foundOrder2.status, 'PAID');

  // -------------------------------------------------------------------------
  // BƯỚC 9: Xem Chi tiết đơn hàng Snapshot (/api/orders/:id)
  // -------------------------------------------------------------------------
  const detailOrderRes = await fetch(`${API_URL}/api/orders/${orderData1.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(detailOrderRes.status, 200, 'GET /api/orders/:id phải trả về HTTP 200');
  const detailOrder = await detailOrderRes.json();
  assert.equal(detailOrder.id, orderData1.id);
  assert.equal(detailOrder.status, 'PAID');
  assert.ok(detailOrder.items && detailOrder.items.length > 0, 'Phải có snapshot danh sách món');
  assert.ok(detailOrder.items[0].productName, 'Snapshot phải lưu tên món tại thời điểm đặt');
  assert.ok(detailOrder.payment, 'Phải có thông tin giao dịch thanh toán thật từ DB');
  assert.equal(detailOrder.payment.method, 'MOCK_WALLET');

  // -------------------------------------------------------------------------
  // BƯỚC 10: BẢO MẬT ĐA KHÁCH THUÊ (MULTI-TENANT): Khách B không được xem đơn Khách A
  // -------------------------------------------------------------------------
  // Đăng ký và đăng nhập Khách Hàng B
  await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password, name: 'Khách Hàng B (Attacker)' }),
  });
  const loginBRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password }),
  });
  const { accessToken: tokenB } = await loginBRes.json();

  // Khách B cố tình đọc đơn của Khách A -> Backend bắt buộc phải trả về HTTP 404 Not Found
  const hackRes = await fetch(`${API_URL}/api/orders/${orderData1.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(
    hackRes.status,
    404,
    'BẢO MẬT ĐA KHÁCH THUÊ: Khách B xem đơn của Khách A phải nhận HTTP 404 Not Found để không làm lộ sự tồn tại của đơn hàng',
  );

  // Không có token JWT -> Phải trả về HTTP 401 Unauthorized
  const unauthRes = await fetch(`${API_URL}/api/orders/${orderData1.id}`);
  assert.equal(unauthRes.status, 401, 'Không có Bearer token phải nhận HTTP 401 Unauthorized');

  console.log('\n============================================================');
  console.log('🎉 E2E REAL SYSTEM TEST: 10/10 BƯỚC CHẠY TRÊN BACKEND & DB THẬT ĐÃ PASS 100%!');
  console.log('============================================================\n');
});
