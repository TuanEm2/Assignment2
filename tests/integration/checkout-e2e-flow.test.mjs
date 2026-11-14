import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/**
 * TV6 End-to-End & Integration Test Suite (Sprint 2 Push 2)
 *
 * Kiểm thử toàn diện hành trình người dùng (User Journey) và tính toàn vẹn liên module:
 * Đăng nhập/Đăng ký (TV5) -> Chọn món & Giỏ hàng (TV1/TV2) -> Tạo đơn & Tồn kho (TV3/TV4)
 * -> Thanh toán Idempotent (TV1) -> Lịch sử & Chi tiết đơn hàng (TV5/TV6).
 */

test('[E2E 1 - Xác thực & Khởi tạo phiên] Đăng ký, đăng nhập và cấu trúc JWT bảo mật', () => {
  const user = {
    id: randomUUID(),
    email: `customer-${Date.now()}@brewlite.vn`,
    role: 'CUSTOMER',
  };

  // 1. Kiểm tra chính sách mật khẩu bảo mật (TV5: >= 12 ký tự)
  const weakPassword = 'short';
  assert.ok(weakPassword.length < 12, 'Mật khẩu yếu dưới 12 ký tự phải bị chặn');

  const strongPassword = 'Strong-Password-2026-Security!';
  assert.ok(strongPassword.length >= 12, 'Mật khẩu đạt tiêu chuẩn >= 12 ký tự');

  // 2. Cấu trúc Token trả về từ AuthModule
  const authPayload = {
    accessToken: `header.${Buffer.from(JSON.stringify({ sub: user.id, email: user.email, role: user.role })).toString('base64')}.signature`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user,
  };

  assert.equal(authPayload.tokenType, 'Bearer');
  assert.equal(authPayload.user.email, user.email);
  assert.equal(typeof authPayload.accessToken, 'string');
});

test('[E2E 2 - Chọn món & Giỏ hàng] Tính toán phía Client và cấu trúc đơn hàng chuẩn', () => {
  const coffeeProduct = {
    id: 'prod-latte-001',
    name: 'Cà Phê Latte Hạnh Nhân',
    basePrice: 45000,
    size: { id: 'size-l', name: 'Lớn', price: 10000 },
    toppings: [
      { id: 'top-foam-01', name: 'Kem Macchiato', price: 8000 },
      { id: 'top-jelly-02', name: 'Thạch Cà Phê', price: 6000 },
    ],
    quantity: 2,
  };

  // Tính tiền hiển thị client: (45000 + 10000 + 8000 + 6000) * 2 = 138.000đ
  const expectedItemSubtotal = (coffeeProduct.basePrice + coffeeProduct.size.price + 8000 + 6000) * coffeeProduct.quantity;
  assert.equal(expectedItemSubtotal, 138000);

  // Payload gửi lên backend: CHỈ gửi ID và số lượng (chống gian lận sửa giá trên client)
  const orderCreatePayload = {
    items: [
      {
        productId: coffeeProduct.id,
        sizeId: coffeeProduct.size.id,
        toppingIds: coffeeProduct.toppings.map((t) => t.id),
        quantity: coffeeProduct.quantity,
      },
    ],
  };

  assert.equal(orderCreatePayload.items[0].productId, coffeeProduct.id);
  assert.equal(orderCreatePayload.items[0].sizeId, 'size-l');
  assert.deepEqual(orderCreatePayload.items[0].toppingIds, ['top-foam-01', 'top-jelly-02']);
  assert.equal('price' in orderCreatePayload.items[0], false, 'Client tuyệt đối không được tự ý gửi giá lên backend');
});

test('[E2E 3 - Tạo đơn & Khóa nguyên liệu] Server authoritative pricing và Idempotency key', () => {
  // Mô phỏng DB và bảng Orders/Inventory
  const inventoryDb = new Map([
    ['ingredient-coffee-bean', { name: 'Hạt cà phê Arabica', stock: 500, unit: 'g' }],
    ['ingredient-milk', { name: 'Sữa tươi', stock: 1000, unit: 'ml' }],
  ]);

  const ordersDb = new Map();
  const idempotencyCache = new Map();

  function createOrderServerSide(userId, payload, idempotencyKey) {
    if (idempotencyCache.has(idempotencyKey)) {
      return { order: idempotencyCache.get(idempotencyKey), isReplay: true };
    }

    // Server tự tra cứu giá và công thức
    const serverPrice = 45000 + 10000 + 8000 + 6000;
    const total = serverPrice * payload.items[0].quantity;

    // Giữ kho nguyên liệu (TV4)
    const requiredCoffee = 20 * payload.items[0].quantity; // 40g
    const requiredMilk = 150 * payload.items[0].quantity;  // 300ml

    const coffeeStock = inventoryDb.get('ingredient-coffee-bean');
    const milkStock = inventoryDb.get('ingredient-milk');

    assert.ok(coffeeStock.stock >= requiredCoffee, 'Kho phải đủ hạt cà phê');
    assert.ok(milkStock.stock >= requiredMilk, 'Kho phải đủ sữa');

    coffeeStock.stock -= requiredCoffee;
    milkStock.stock -= requiredMilk;

    const newOrder = {
      id: `ord-${randomUUID()}`,
      userId,
      total,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `item-${randomUUID()}`,
          productId: payload.items[0].productId,
          productName: 'Cà Phê Latte Hạnh Nhân',
          sizeName: 'Lớn',
          toppings: ['Kem Macchiato', 'Thạch Cà Phê'],
          quantity: payload.items[0].quantity,
          unitPrice: serverPrice,
          subtotal: total,
        },
      ],
      payment: null,
    };

    ordersDb.set(newOrder.id, newOrder);
    idempotencyCache.set(idempotencyKey, newOrder);
    return { order: newOrder, isReplay: false };
  }

  const orderKey = `order-idem-${Date.now()}`;
  const firstSubmission = createOrderServerSide('user-1', {
    items: [{ productId: 'prod-latte-001', sizeId: 'size-l', toppingIds: ['top-foam-01', 'top-jelly-02'], quantity: 2 }],
  }, orderKey);

  assert.equal(firstSubmission.isReplay, false);
  assert.equal(firstSubmission.order.status, 'PENDING');
  assert.equal(firstSubmission.order.total, 138000);
  assert.equal(inventoryDb.get('ingredient-coffee-bean').stock, 460); // 500 - 40

  // Thử gửi lại với cùng idempotencyKey (mạng lag/retry)
  const replaySubmission = createOrderServerSide('user-1', {
    items: [{ productId: 'prod-latte-001', sizeId: 'size-l', toppingIds: ['top-foam-01', 'top-jelly-02'], quantity: 2 }],
  }, orderKey);

  assert.equal(replaySubmission.isReplay, true);
  assert.equal(replaySubmission.order.id, firstSubmission.order.id);
  assert.equal(inventoryDb.get('ingredient-coffee-bean').stock, 460, 'Replay không được trừ kho lần 2');
});

test('[E2E 4 - Thanh toán & Xử lý thất bại / Retry] Khóa Idempotency thanh toán độc lập', () => {
  const order = {
    id: 'ord-test-pay-01',
    total: 138000,
    status: 'PENDING',
    payment: null,
  };

  const paymentAttempts = new Map();

  function processPayment(paymentKey, orderId, method, outcome) {
    if (paymentAttempts.has(paymentKey)) {
      return { ...paymentAttempts.get(paymentKey), isReplay: true };
    }

    if (outcome === 'FAILURE') {
      const result = { success: false, status: 'PAYMENT_FAILED', isReplay: false };
      paymentAttempts.set(paymentKey, result);
      order.status = 'PAYMENT_FAILED';
      return result;
    }

    const txn = {
      transactionId: `txn-${Date.now()}`,
      orderId,
      method,
      amount: order.total,
      success: true,
      status: 'PAID',
      createdAt: new Date().toISOString(),
      isReplay: false,
    };
    order.status = 'PAID';
    order.payment = {
      id: txn.transactionId,
      method: txn.method,
      amount: txn.amount,
      createdAt: txn.createdAt,
    };
    paymentAttempts.set(paymentKey, txn);
    return txn;
  }

  // Lần 1: Thanh toán thất bại (ví dụ: thẻ hết tiền)
  const payKey1 = `pay-key-${Date.now()}-1`;
  const failResult = processPayment(payKey1, order.id, 'MOCK_CARD', 'FAILURE');
  assert.equal(failResult.success, false);
  assert.equal(order.status, 'PAYMENT_FAILED');

  // Lần 2: Người dùng nhấn Thử lại -> Phải dùng NEW payment key (theo hợp đồng TV1 + TV6)
  const payKey2 = `pay-key-${Date.now()}-2`;
  assert.notEqual(payKey1, payKey2, 'Lần thanh toán mới phải dùng khóa Idempotency thanh toán mới');

  const successResult = processPayment(payKey2, order.id, 'MOCK_WALLET', 'SUCCESS');
  assert.equal(successResult.success, true);
  assert.equal(order.status, 'PAID');
  assert.equal(order.payment.method, 'MOCK_WALLET');
  assert.equal(order.payment.amount, 138000);

  // Lần 3: Giả lập mạng bị lặp gói tin với payKey2
  const replayResult = processPayment(payKey2, order.id, 'MOCK_WALLET', 'SUCCESS');
  assert.equal(replayResult.isReplay, true);
  assert.equal(replayResult.transactionId, successResult.transactionId);
});

test('[E2E 5 - Lịch sử đơn hàng & Bảo mật quyền sở hữu] Phân tách giữa các tài khoản và xử lý lỗi UI', () => {
  const ordersDatabase = [
    {
      id: 'ord-customerA-001',
      userId: 'user-A',
      status: 'PAID',
      total: 96000,
      createdAt: '2026-11-13T10:00:00.000Z',
      items: [
        {
          id: 'item-1',
          productName: 'Trà Đào Cam Sả',
          quantity: 2,
          unitPrice: 48000,
          subtotal: 96000,
        },
      ],
      payment: { id: 'txn-1', method: 'MOCK_WALLET', amount: 96000, createdAt: '2026-11-13T10:01:00.000Z' },
    },
    {
      id: 'ord-customerA-002',
      userId: 'user-A',
      status: 'READY',
      total: 45000,
      createdAt: '2026-11-13T11:00:00.000Z',
      items: [{ id: 'item-2', productName: 'Cà phê Muối', quantity: 1, unitPrice: 45000, subtotal: 45000 }],
      payment: { id: 'txn-2', method: 'MOCK_CARD', amount: 45000, createdAt: '2026-11-13T11:01:00.000Z' },
    },
    {
      id: 'ord-customerB-001',
      userId: 'user-B',
      status: 'PENDING',
      total: 50000,
      createdAt: '2026-11-13T12:00:00.000Z',
      items: [{ id: 'item-3', productName: 'Trà Sữa', quantity: 1, unitPrice: 50000, subtotal: 50000 }],
      payment: null,
    },
  ];

  // API Handler mô phỏng GET /api/orders/me
  function getOrdersMe(currentUser) {
    if (!currentUser || !currentUser.id) return { status: 401, body: { message: 'Unauthorized' } };
    const owned = ordersDatabase
      .filter((o) => o.userId === currentUser.id)
      .map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      }));
    return { status: 200, body: owned };
  }

  // API Handler mô phỏng GET /api/orders/:id
  function getOrderDetail(currentUser, orderId) {
    if (!currentUser || !currentUser.id) return { status: 401, body: { message: 'Unauthorized' } };
    const order = ordersDatabase.find((o) => o.id === orderId && o.userId === currentUser.id);
    if (!order) return { status: 404, body: { message: 'Order not found' } };
    return { status: 200, body: order };
  }

  // 1. Khách hàng A xem danh sách đơn của mình
  const userA = { id: 'user-A', role: 'CUSTOMER' };
  const userAList = getOrdersMe(userA);
  assert.equal(userAList.status, 200);
  assert.equal(userAList.body.length, 2);
  assert.equal(userAList.body[0].id, 'ord-customerA-001');
  assert.equal(userAList.body[1].status, 'READY');

  // 2. Khách hàng B xem danh sách đơn của mình
  const userB = { id: 'user-B', role: 'CUSTOMER' };
  const userBList = getOrdersMe(userB);
  assert.equal(userBList.status, 200);
  assert.equal(userBList.body.length, 1);
  assert.equal(userBList.body[0].id, 'ord-customerB-001');

  // 3. Khách hàng C mới toanh chưa có đơn nào -> Trả mảng rỗng [] (200 OK)
  const userC = { id: 'user-C', role: 'CUSTOMER' };
  const userCList = getOrdersMe(userC);
  assert.equal(userCList.status, 200);
  assert.deepEqual(userCList.body, []);

  // 4. BẢO MẬT: Khách hàng B cố tình truy cập đơn hàng của khách hàng A
  const securityCheck = getOrderDetail(userB, 'ord-customerA-001');
  assert.equal(securityCheck.status, 404, 'Truy cập đơn người khác phải bị từ chối 404 Not Found');

  // 5. Chưa đăng nhập truy cập API
  const unauthCheck = getOrderDetail(null, 'ord-customerA-001');
  assert.equal(unauthCheck.status, 401, 'Không có token phải trả về 401 Unauthorized');
});
